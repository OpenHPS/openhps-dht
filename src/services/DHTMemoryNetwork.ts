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
        return this.addNodeInternal(node, false);
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
            const nodeIDs = Array.from(this.nodes.values())
                .map((node) => [node.nodeID, this.xorDistance(node.nodeID, key)] as const)
                .sort((a, b) => a[1] - b[1])
                .slice(0, count)
                .map(([nodeID]) => nodeID);
            Promise.all(nodeIDs.map((nodeID) => this.findNodeById(nodeID)))
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
                                        if (value.length > 0) {
                                            foundValue = value;
                                            return true;
                                        }
                                        return findValue();
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
