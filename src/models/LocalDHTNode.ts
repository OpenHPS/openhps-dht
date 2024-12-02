import { NumberType, SerializableMapMember, SerializableMember, SerializableObject } from '@openhps/core';
import { DHTNode, NodeID } from './DHTNode';
import { DHTNetwork } from '../services/DHTNetwork';

const K = 20;

@SerializableObject({
    name: 'DHTNode',
})
export class LocalDHTNode implements DHTNode {
    @SerializableMember({
        numberType: NumberType.INTEGER,
    })
    nodeID: number;
    @SerializableMember()
    collection: string;
    @SerializableMember()
    locator: string;
    @SerializableMapMember(String, String)
    dataStore?: Map<number, string[]>;
    @SerializableMapMember(Number, Array)
    buckets: Map<number, NodeID[]>;
    network: DHTNetwork;

    constructor(nodeID: number, network: DHTNetwork) {
        this.nodeID = nodeID;
        this.dataStore = new Map();
        this.buckets = new Map();
        this.network = network;
    }

    protected xorDistance(a: NodeID, b: NodeID): number {
        return Math.abs(a ^ b);
    }

    store(key: number, value: string | string[], visitedNodes: Set<NodeID> = new Set(), maxHops: number = 0): Promise<void> {
        return new Promise((resolve, reject) => {
            if (maxHops <= 0) {
                this.storeLocal(key, value).then(resolve).catch(reject);
                return;
            }

            this._findNodeByKey(key)
                .then((closestNode) => {
                    if (closestNode.nodeID === this.nodeID || visitedNodes.has(closestNode.nodeID)) {
                        // Store locally
                        this.storeLocal(key, value).then(resolve).catch(reject);
                    } else {
                        // Mark the current node as visited
                        visitedNodes.add(this.nodeID);
                        // Pass the value to the closest node for storage
                        return closestNode.store(key, value, visitedNodes, maxHops - 1);
                    }
                })
                .then(resolve).catch(reject);
        });
    }

    findValue(key: number, visitedNodes?: Set<NodeID>, maxHops?: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            if (this.dataStore.has(key)) {
                return resolve(this.dataStore.get(key)!);
            }

            if (maxHops <= 0) {
                resolve([]);
                return;
            }

            // Mark the current node as visited
            visitedNodes.add(this.nodeID);
            this._findNodeByKey(key)
                .then((closestNode) => {
                    if (closestNode && closestNode.nodeID !== this.nodeID && !visitedNodes.has(closestNode.nodeID)) {
                        return closestNode.findValue(key, visitedNodes, maxHops--).then((value) => ({ value, closestNode }));
                    } else {
                        resolve([]);
                    }
                })
                .then((value) => {
                    if (value.value) {
                        // Cache the value locally if this node is close enough to the key
                        const distanceToClosestNode = this.xorDistance(key, value.closestNode.nodeID);
                        const distanceToThisNode = this.xorDistance(key, this.nodeID);

                        if (distanceToThisNode < distanceToClosestNode) {
                            this.dataStore.set(key, value.value);
                        }
                    }
                    resolve(value.value);
                })
                .catch(reject);
        });
    }

    ping(): Promise<void> {
        return new Promise((resolve) => {
            for (const bucket of this.buckets.values()) {
                for (const nodeId of bucket) {
                    const node = this.network.findNodeById(nodeId);
                    if (!node) {
                        // Find keys that were stored on the failed node
                        const keysToRedistribute: Array<[number, string[]]> = [];
                        for (const [key, value] of this.dataStore) {
                            keysToRedistribute.push([key, value]);
                        }

                        Promise.all(
                            keysToRedistribute.map(([key, value]) =>
                                this.network.findNodesByKey(key).then((closestNodes) => {
                                    // If the failed node was among the k closest nodes, redistribute the key
                                    if (closestNodes.find((node) => node.nodeID === nodeId)) {
                                        return this.store(key, value);
                                    }
                                }),
                            ),
                        )
                            .then(() => {
                                resolve();
                            })
                            .catch((error) => {
                                console.error('Error redistributing keys:', error);
                                resolve();
                            });
                    }
                }
            }
            resolve();
        });
    }

    /**
     * Add a node to the network
     * @param {NodeID} nodeID Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve) => {
            if (nodeID === this.nodeID) {
                // Do not add itself
                resolve();
                return;
            }

            const distance = this.xorDistance(this.nodeID, nodeID);
            const bucketIndex = Math.floor(Math.log2(distance)); // Determine bucket
            if (!this.buckets.has(bucketIndex)) {
                this.buckets.set(bucketIndex, []);
            }

            const bucket = this.buckets.get(bucketIndex)!;

            // Check if the node is already in the bucket`
            if (!bucket.includes(nodeID)) {
                if (bucket.length >= K) {
                    // If the bucket is full, remove the oldest node (simple eviction policy)
                    bucket.shift();
                }
                bucket.push(nodeID);
            }
            resolve();
        });
    }

    /**
     * Remove a node from the network
     * @param {number} nodeID Node to remove
     * @returns {Promise<void>} Promise when the node is removed
     */
    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve) => {
            const distance = this.xorDistance(this.nodeID, nodeID);
            const bucketIndex = Math.floor(Math.log2(distance)); // Determine bucket
            if (!this.buckets.has(bucketIndex)) {
                return;
            }

            const bucket = this.buckets.get(bucketIndex)!;
            const index = bucket.indexOf(nodeID);
            if (index !== -1) {
                bucket.splice(index, 1);
            }
            resolve();
        });
    }

    protected storeLocal(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve) => {
            const values = this.dataStore.get(key) || [];
            if (Array.isArray(value)) {
                values.push(...value);
            } else {
                values.push(value);
            }
            this.dataStore.set(key, values);
            resolve();
        });
    }

    /**
     * Check if the node has a value
     * @param {number} key Key to check
     * @returns {Promise<boolean>} Promise when the value is checked
     */
    hasValue(key: number): Promise<boolean> {
        return new Promise((resolve) => {
            resolve(this.dataStore.has(key));
        });
    }

    private _findNodeByKey(key: number): Promise<DHTNode> {
        return new Promise((resolve, reject) => {
            let closestNodeId: NodeID | null = null;
            let closestDistance = Infinity;

            this.buckets.forEach((bucket) => {
                for (const nodeId of bucket) {
                    const distance = this.xorDistance(key, nodeId);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestNodeId = nodeId;
                    }
                }
            });
            this.network
                .findNodeById(closestNodeId)
                .then((node) => {
                    resolve(node);
                })
                .catch(reject);
        });
    }
}
