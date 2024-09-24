import { DHTNode, LocalDHTNode, NodeID, RemoteDHTNode } from '../models';
import { DHTNetwork } from './DHTNetwork';

export class DHTMemoryNetwork extends DHTNetwork {
    public static readonly NODES: Map<NodeID, DHTNode> = new Map();
    protected nodeHandler: RemoteDHTNode;

    createLocalNode(nodeID: number): Promise<LocalDHTNode> {
        return new Promise((resolve) => {
            resolve(new LocalDHTNode(nodeID, this));
        });
    }

    addNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
            DHTMemoryNetwork.NODES.set(node.nodeID, this.nodeHandler ? new Proxy(node, this.nodeHandler) : node);

            Promise.all(
                Array.from(DHTMemoryNetwork.NODES.values()).map((otherNode) => {
                    if (otherNode.nodeID !== node.nodeID) {
                        return Promise.all([otherNode.addNode(node.nodeID), node.addNode(otherNode.nodeID)]);
                    }
                    return Promise.resolve();
                }),
            )
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    removeNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
            DHTMemoryNetwork.NODES.delete(node.nodeID);
            Promise.all(
                Array.from(DHTMemoryNetwork.NODES.values()).map((otherNode) => otherNode.removeNode(node.nodeID)),
            )
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        return new Promise((resolve, reject) => {
            if (DHTMemoryNetwork.NODES.has(nodeID)) {
                resolve(DHTMemoryNetwork.NODES.get(nodeID));
            } else {
                reject(new Error('Node not found'));
            }
        });
    }

    findNodesByKey(key: number, count: number = 5): Promise<DHTNode[]> {
        return new Promise((resolve, reject) => {
            Promise.all(
                Array.from(DHTMemoryNetwork.NODES.values())
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
                    console.log(closestNodes);
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
                        reject(new Error('Value not found'));
                    }
                })
                .then((found) => {
                    if (found) {
                        resolve(foundValue);
                    } else {
                        reject(new Error('Value not found'));
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
                Array.from(DHTMemoryNetwork.NODES.values()).map((node) => {
                    return node.ping();
                }),
            )
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    static reset(): void {
        DHTMemoryNetwork.NODES.clear();
    }
}
