import { DHTNode, LocalDHTNode, NodeID, RemoteDHTNode } from '../models';
import { DHTNetwork } from './DHTNetwork';

export class DHTMemoryNetwork extends DHTNetwork {
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
            // Skip if the node is already in the network
            if (this.nodes.has(node.nodeID) || node.nodeID === this.node.nodeID) {
                resolve();
                return;
            } else if (node.nodeID === undefined) {
                throw new Error('Node ID is undefined');
            }

            // Set reference to network
            node = this.nodeHandler ? new Proxy(node, this.nodeHandler) : node;
            node.network = this;

            // Add node locally
            this.nodes.set(node.nodeID, node);
            this.service.logger(
                'info',
                `Adding node #${node.nodeID} to the network [#${this.node.nodeID}] (total: ${this.nodes.size})`,
            );

            // Avoid circular dependencies
            const timeout = new Promise<void>((resolve) =>
                setTimeout(() => {
                    resolve();
                }, 5000),
            );
            Promise.race([
                Promise.all(
                    Array.from(this.nodes.values()).map((otherNode) => {
                        if (otherNode.nodeID === node.nodeID) {
                            return Promise.resolve();
                        }
                        return Promise.all([
                            // Add the new node to the other node
                            otherNode.addNode(node.nodeID),
                        ]);
                    }),
                ),
                timeout,
            ])
                .then(() => {
                    Promise.all(
                        Array.from(this.nodes.values()).map((otherNode) => {
                            if (otherNode.nodeID === node.nodeID) {
                                return Promise.resolve();
                            }
                            return Promise.all([
                                // Add the other node to the new node
                                node.addNode(otherNode.nodeID),
                            ]);
                        }),
                    );
                    resolve();
                })
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
                this.service.logger('error', `Node #${nodeID} not found`);
                reject(new Error(`Node #${nodeID} not found`));
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
                    if (targetNode[0].nodeID === this.node.nodeID) {
                        this.service.logger('info', `Storing value '${value}' locally`);
                    } else {
                        this.service.logger('info', `Storing value '${value}' in node #${targetNode[0].nodeID}`);
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
