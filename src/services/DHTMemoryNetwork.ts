import { DHTNode, LocalDHTNode, NodeID, RemoteDHTNode } from '../models';
import { DHTNetwork } from './DHTNetwork';

export class DHTMemoryNetwork extends DHTNetwork {
    public readonly nodes: Map<NodeID, DHTNode> = new Map();
    protected nodeHandler: RemoteDHTNode;

    constructor(collection: string = 'default', nodes?: Map<NodeID, DHTNode>) {
        super(collection);
        if (nodes) {
            this.nodes = nodes;
        }
    }

    createLocalNode(nodeID: number): Promise<LocalDHTNode> {
        return new Promise((resolve) => {
            resolve(new LocalDHTNode(nodeID, this));
        });
    }

    addNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Set reference to network
            node = this.nodeHandler ? new Proxy(node, this.nodeHandler) : node;
            node.network = this;
            // Add node locally
            this.nodes.set(node.nodeID, node);
            
            Promise.all(
                Array.from(this.nodes.values()).map((otherNode) => {
                    return Promise.all([
                        // Add the new node to the other node
                        otherNode.addNode(node.nodeID), 
                        // Add the other node to the new node
                        node.addNode(otherNode.nodeID)
                    ]);
                }),
            )
                .then(() => resolve())
                .catch(reject);
        });
    }

    removeNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Delete node locally
            this.nodes.delete(node.nodeID);

            Promise.all(Array.from(this.nodes.values()).map((otherNode) => otherNode.removeNode(node.nodeID)))
                .then(() => resolve())
                .catch(reject);
        });
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        return new Promise((resolve, reject) => {
            if (this.nodes.has(nodeID)) {
                resolve(this.nodes.get(nodeID));
            } else {
                reject(new Error('Node not found'));
            }
        });
    }

    findNodesByKey(key: number, count: number = 5): Promise<DHTNode[]> {
        return new Promise((resolve, reject) => {
            Promise.all(
                Array.from(this.nodes.values())
                    .map((node) => node.nodeID)
                    .sort((a, b) => this.xorDistance(a, key) - this.xorDistance(b, key))
                    .slice(0, count)
                    .map((nodeID) => this.findNodeById(nodeID)),
            )
                .then(resolve)
                .catch(reject);
        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            let foundValue: string[] = [];
            this.findNodesByKey(key)
                .then((closestNodes) => {
                    if (closestNodes.length > 0) {
                        // Loop through all nodes and check if they have the value
                        // if yes, return the value and stop the loop
                        let i = 0;
                        const findValue = () => {
                            if (i < closestNodes.length) {
                                const node = closestNodes[i];
                                i++;
                                return node
                                    .findValue(key)
                                    .then((value) => {
                                        foundValue = value;
                                        return true;
                                    })
                                    .catch(() => {
                                        return findValue();
                                    });
                            }
                            return false;
                        };
                        return findValue();
                    } else {
                        resolve([]);
                    }
                })
                .then((found) => {
                    if (found) {
                        resolve(foundValue);
                    } else {
                        resolve([]);
                    }
                })
                .catch(reject);
        });
    }

    storeValue(key: number, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.findNodesByKey(key, 1)
                .then((targetNode) => {
                    if (targetNode.length === 0) {
                        throw new Error('No nodes found');
                    }
                    return targetNode[0].store(key, value);
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            Promise.all(
                Array.from(this.nodes.values()).map((node) => {
                    return node.ping();
                }),
            )
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}
