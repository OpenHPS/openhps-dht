import { GeographicalPosition, LengthUnit, Service } from '@openhps/core';
import { DHTNode, NodeID } from '../models/DHTNode';
import { DHTNetwork } from './DHTNetwork';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RectangleCornerBoundary, RectangleRotationBoundary } from '@openhps/geospatial';
import { IriString } from '@openhps/rdf';

const GRID_SIZE = 10; // 10 km
// Maximum number of partitions searched in each direction when the accuracy covers
// multiple partitions. Bounds the number of keys returned (and thus the number of
// lookups performed) for very large accuracies, e.g. 2000 km would otherwise cover
// some 160k partitions.
const MAX_ACCURACY_PARTITIONS = 10; // 100 km search radius

export type Boundary =
    | GeographicalPosition[]
    | RectangleCornerBoundary<GeographicalPosition>
    | RectangleRotationBoundary<GeographicalPosition>;

/**
 * Distributed Hash Table Service
 */
export class DHTService extends Service {
    public network: DHTNetwork;
    protected boundary: Boundary;
    protected system: string | IriString;

    constructor(network: DHTNetwork = new DHTMemoryNetwork()) {
        super();
        this.network = network;
        this.network.service = this;

        // Generate a random latitude and longitude
        this.once('build', () => {
            const latitude = Math.random() * 180 - 90;
            const longitude = Math.random() * 360 - 180;
            const nodeID = this.hash(latitude, longitude)[0];
            return this.network.initialize(nodeID, this.model);
        });
    }

    setSystem(system: string | IriString): this {
        this.system = system;
        return this;
    }

    /**
     * Set the boundary of the positioning systems
     * @param boundary Positioning system boundary
     * @returns {DHTService} DHT service instance
     */
    setBounds(bounds: GeographicalPosition[]): this;
    setBounds(bounds: RectangleCornerBoundary<GeographicalPosition>): this;
    setBounds(bounds: RectangleRotationBoundary<GeographicalPosition>): this;
    setBounds(bounds: any): this {
        this.boundary = bounds;
        return this;
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        return this.network.findNodeById(nodeID);
    }

    addNode(node: DHTNode): Promise<void> {
        return this.network.addNode(node);
    }

    removeNode(node: DHTNode): Promise<void> {
        return this.network.removeNode(node);
    }

    /**
     * Store a value in the DHT
     * @param {number} key Hashed key
     * @param {string} value Value to store
     * @returns {Promise<void>} Promise that resolves once the value is stored
     */
    storeValue(key: number, value: string): Promise<void> {
        return this.network.storeValue(key, value);
    }

    /**
     * Get the node
     */
    get node(): DHTNode {
        return this.network.node;
    }

    /**
     * Get the node identifier
     */
    get nodeID(): NodeID {
        return this.node.nodeID;
    }

    addPositioningSystem(
        system: string,
        latitude: number,
        longitude: number,
        accuracy: number,
        accuracyUnit?: LengthUnit,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const keys = this.hash(latitude, longitude, accuracy, accuracyUnit);
            // Get all nodes for the keys and add the positioning system
            // resolve once completed
            Promise.all(
                keys.map((key) => {
                    return this.network.storeValue(key, system);
                }),
            )
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    findPositioningSystems(
        latitude: number,
        longitude: number,
        accuracy: number,
        accuracyUnit?: LengthUnit,
    ): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const keys = this.hash(latitude, longitude, accuracy, accuracyUnit);
            // Get all nodes for the keys and find the positioning systems
            // resolve once completed
            Promise.all(
                keys.map((key: number) => {
                    return this.network.findValue(key);
                }),
            )
                .then((results) => {
                    resolve(results.flat());
                })
                .catch(reject);
        });
    }

    /**
     * Hashing function for converting the latitude, longitude and accuracy to a key
     * @param {number} latitude Latitude in degrees
     * @param {number} longitude Longitude in degrees
     * @param {number} [accuracy] Accuracy in meters
     * @param {LengthUnit} [accuracyUnit] Accuracy unit
     * @returns {number[]} Hashed key(s). Multiple keys will be returned if the accuracy is too large
     */
    hash(latitude: number, longitude: number, accuracy?: number, accuracyUnit?: LengthUnit): number[] {
        // Get the accuracy in meters
        const accuracyMeters = accuracy && accuracyUnit ? accuracyUnit.convert(accuracy, LengthUnit.METER) : accuracy;

        // Normalise the latitude and longitude
        const latNorm = latitude + 90;
        const lngNorm = longitude + 180;

        // Partition the globe into partitions
        const partition = GRID_SIZE / 111.132954; // km in degrees
        // Split the coordinates into partitions
        const latPartition = Math.floor(latNorm / partition);
        const lonPartition = Math.floor(lngNorm / partition);

        // Radix of the combined key: one more than the number of longitude partitions
        // that fit in the normalised range (~4000). Using it as the latitude multiplier
        // guarantees that distinct (lat, lon) partition pairs map to distinct keys:
        // the old scheme used a fixed multiplier (31) that is smaller than the longitude
        // partition range, so distinct partitions mapped to the same key.
        const lonRadix = Math.floor(360 / partition) + 1;

        // Verify that the accuracy is not too large for the partition
        // if yes, multiple keys will be returned for each partition the accuracy covers
        let accuracyPartition = 1;
        if (accuracyMeters) {
            // Get the accuracy in degrees
            const accuracyDegrees = accuracyMeters / 111132.954;
            // Get the number of partitions the accuracy covers
            accuracyPartition = Math.ceil(accuracyDegrees / partition);
        }
        // Return multiple keys if the accuracy is too large: the keys of every
        // partition the accuracy covers, expanded outward from the origin partition
        // (which is always the first key).
        const accuracyRadius = Math.min(accuracyPartition - 1, MAX_ACCURACY_PARTITIONS);
        if (accuracyRadius > 0) {
            const keys = [];
            for (let d = 0; d <= accuracyRadius; d++) {
                for (let row = -d; row <= d; row++) {
                    for (let col = -d; col <= d; col++) {
                        // Only the partitions on the ring at distance d
                        if (Math.max(Math.abs(row), Math.abs(col)) !== d) {
                            continue;
                        }
                        keys.push((latPartition + row) * lonRadix + (lonPartition + col));
                    }
                }
            }
            return keys;
        } else {
            // Combine the latitude and longitude partition to a unique key
            return [latPartition * lonRadix + lonPartition];
        }
    }
}
