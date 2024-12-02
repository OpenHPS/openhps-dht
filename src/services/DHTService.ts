import { LengthUnit, Service } from '@openhps/core';
import { DHTNode, NodeID } from '../models/DHTNode';
import { DHTNetwork } from './DHTNetwork';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';

const GRID_SIZE = 10; // 10 km

/**
 * Distributed Hash Table Service
 */
export class DHTService extends Service {
    public network: DHTNetwork;

    constructor(network: DHTNetwork = new DHTMemoryNetwork()) {
        super();
        this.network = network;

        // Generate a random latitude and longitude
        this.once('build', () => {
            const latitude = Math.random() * 180 - 90;
            const longitude = Math.random() * 360 - 180;
            const nodeID = this.hash(latitude, longitude)[0];
            return network.initialize(nodeID);
        });
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

        // Partition the globe into partitions
        const partition = GRID_SIZE / 111.132954; // km in degrees
        // Split the coordinates into partitions
        const latPartition = Math.floor(latitude / partition);
        const lonPartition = Math.floor(longitude / partition);

        // Verify that the accuracy is not too large for the partition
        // if yes, multiple keys will be returned for each partition the accuracy covers
        let accuracyPartition = 1;
        if (accuracyMeters) {
            // Get the accuracy in degrees
            const accuracyDegrees = accuracyMeters / 111132.954;
            // Get the number of partitions the accuracy covers
            accuracyPartition = Math.ceil(accuracyDegrees / partition);
        }
        // Return multiple keys if the accuracy is too large
        const prime = 31; // Prime key to ensure unique keys
        if (accuracyPartition > 1) {
            const keys = [];
            for (let i = 0; i < accuracyPartition; i++) {
                keys.push(latPartition * prime + lonPartition + i);
            }
            return keys;
        } else {
            // Combine the latitude and longitude partition to a unique key
            return [latPartition * prime + lonPartition];
        }
    }
}
