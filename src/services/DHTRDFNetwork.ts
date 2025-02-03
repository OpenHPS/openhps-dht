import { DataFactory, foaf, IriString, RDFSerializer } from '@openhps/rdf';
import { DHTNode, NodeID } from '../models/DHTNode';
import { LocalRDFNode } from '../models/ldht/LocalRDFNode';
import { LDHTAddNodeAction, LDHTPingAction, LDHTRemoveNodeAction, LDHTStoreValueAction } from '../models/ldht';

import { Collection, SolidClientService } from '@openhps/solid';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RemoteRDFNode } from '../models/ldht/RemoteRDFNode';
import { Model } from '@openhps/core';
import { DHTService } from './DHTService';

/**
 * Distributed hash table RDF network
 */
export class DHTRDFNetwork extends DHTMemoryNetwork {
    protected nodeHandler: RemoteRDFNode;
    protected solidService: SolidClientService;
    protected collectionInstance: Collection;
    protected podUrl: IriString;

    constructor(collectionName?: string, collectionUri?: IriString) {
        super(collectionName);
        this.collectionInstance = new Collection(collectionUri);
    }

    set service(service: DHTService) {
        super.service = service;
        service.dependencies.push(SolidClientService);
    }

    get service(): DHTService {
        return super.service;
    }

    /**
     * Initialize the network
     * @param {number} nodeID Node identifier to use as the local node
     * @param model Model to use
     * @returns {Promise<void>} Promise when the network is initialized
     */
    initialize(nodeID: number, model?: Model): Promise<void> {
        return new Promise((resolve, reject) => {
            // Get the Solid service of the node
            if (model) {
                this.solidService = model.findService(SolidClientService);
            } else {
                reject(new Error('No positioning model found'));
            }

            if (!this.solidService) {
                reject(new Error('No Solid service found in the model'));
            }

            if (!this.service) {
                reject(new Error('Network was created without a service'));
            }

            this.solidService.once('ready', () => {
                if (!this.solidService.session || !this.solidService.session.info.isLoggedIn) {
                    reject(new Error('No Solid session found in the service'));
                }

                this.solidService
                    .getPodUrl(this.solidService.session)
                    .then((podUrl) => {
                        this.podUrl = podUrl;
                    })
                    .then(() => {
                        return super.initialize(nodeID, model);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    createLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodesContainer: IriString = this.podUrl.endsWith('/') ? `${this.podUrl}nodes/` : `${this.podUrl}/nodes/`;
            const url: IriString = `${nodesContainer}${this.collection}/`;
            const nodeUrl: IriString = `${url}node.ttl#`;
            const actionsUrl: IriString = `${url}actions/`;

            this.service.logger('debug', `Creating 'nodes' container at ${nodesContainer}`);
            this.solidService
                .createContainer(this.solidService.session, nodesContainer)
                .then(() => {
                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 1000);
                    });
                }).then(() => {
                    this.service.logger('debug', `Creating 'collection' container at ${url}`);
                    return this.solidService.createContainer(this.solidService.session, `${url}`);
                })
                .then(() => {
                    this.service.logger('debug', `Creating 'actions' container at ${actionsUrl}`);
                    return this.solidService.createContainer(this.solidService.session, `${actionsUrl}`);
                })
                .then(() => {
                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 1000);
                    });
                }).then(() => {
                    // Ensure that the acl rights for "url" are read only
                    // Ensure that the acl rights for "actionsUrl" are read and append
                    this.service.logger('debug', `Setting access rights for ${url}`);
                    return Promise.all([
                        this.solidService.setAccess(
                            url,
                            {
                                read: true,
                                write: false,
                                append: false,
                                controlRead: false,
                                controlWrite: false,
                            },
                            foaf.Agent,
                            this.solidService.session,
                        ),
                        this.solidService.setAccess(
                            actionsUrl,
                            {
                                read: true,
                                write: false,
                                append: true,
                                controlRead: false,
                                controlWrite: false,
                            },
                            foaf.Agent,
                            this.solidService.session,
                        ),
                    ]);
                })
                .then(() => {
                    this.service.logger('debug', `Fetching node at ${nodeUrl}`);
                    return this.fetchLocalNode(nodeID);
                })
                .then((node) => {
                    resolve(node);
                })
                .catch(err => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    protected fetchLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodesContainer: IriString = this.podUrl.endsWith('/') ? `${this.podUrl}nodes/` : `${this.podUrl}/nodes/`;
            const url: IriString = `${nodesContainer}${this.collection}/`;
            const nodeUrl: IriString = `${url}node.ttl#`;
            const actionsUrl: IriString = `${url}actions/`;
            const nodesUri: IriString = `${url}nodes.ttl`;
            const dataUri: IriString = `${url}data.ttl`;
            
            let node: LocalRDFNode;

            this.solidService.getDatasetStore(this.solidService.session, nodeUrl)
            .then((store) => {
                node = RDFSerializer.deserializeFromStore(DataFactory.namedNode(nodeUrl), store);
                if (!node) {
                    // Create a new local node
                    this.service.logger('debug', `Creating new local node at ${nodeUrl}`);
                    node = new LocalRDFNode(nodeID, this);
                    node.uri = nodeUrl;
                    node.dataUri = dataUri;
                    node.nodesUri = nodesUri;
                    node.collection = this.collection;
                    node.actions = [
                        new LDHTPingAction().setTarget(actionsUrl as IriString),
                        new LDHTAddNodeAction().setTarget(actionsUrl as IriString),
                        new LDHTRemoveNodeAction().setTarget(actionsUrl as IriString),
                        new LDHTStoreValueAction().setTarget(actionsUrl as IriString),
                    ];
                    // Store node
                    const quads = RDFSerializer.serializeToQuads(node);
                    store.addQuads(quads);
                    return this.solidService.saveDatasetStore(this.solidService.session, nodeUrl, store)
                } else {
                    resolve(node);
                }
            }).then(() => {
                this.service.logger('debug', `Setting access rights for ${nodeUrl}`);
                return this.solidService.setAccess(
                    nodeUrl,
                    {
                        read: true,
                        write: false,
                        append: false,
                        controlRead: false,
                        controlWrite: false,
                    },
                    foaf.Agent,
                    this.solidService.session,
                );
            }).then(() => {
                resolve(node);
            }).catch(err => {
                console.error("Error creating node", err);
                reject(err);
            });
        });
    }

    /**
     * Add a node to the network
     * @param {DHTNode} node Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(node: RemoteRDFNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Add the node in memory and broadcast to nearby other nodes
            this.nodes.set(node.nodeID, this.nodeHandler ? new Proxy(node, this.nodeHandler) : node);
            // Save the node to the Solid pod

            Promise.all(
                Array.from(this.nodes.values()).map((otherNode) => {
                    if (otherNode.nodeID !== node.nodeID) {
                        return Promise.all([otherNode.addNode(node.nodeID), node.addNode(otherNode.nodeID)]);
                    }
                    return Promise.resolve();
                }),
            )
                .then(() => resolve())
                .catch(reject);
        });
    }

    removeNode(node: RemoteRDFNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Delete node locally
            this.nodes.delete(node.nodeID);
            // Save the deleted node

            Promise.all(Array.from(this.nodes.values()).map((otherNode) => otherNode.removeNode(node.nodeID)))
                .then(() => resolve())
                .catch(reject);
        });
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        return super.findNodeById(nodeID);
    }

    findNodesByKey(key: number, count?: number): Promise<DHTNode[]> {
        return super.findNodesByKey(key, count);
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const foundValue: string[] = [];
            this.findNodesByKey(key)
                .then((closestNodes) => {
                    if (closestNodes.length > 0) {
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
            // Create a ping action to all registered nodes
            const pingPromises = Array.from(this.nodes.values()).map((node) => node.ping());
            Promise.all(pingPromises)
                .then(() => {
                    resolve();
                })
                .catch(reject);

            setTimeout(() => {
                reject(new Error('Ping timeout: Not all nodes responded within 10 seconds'));
            }, 10000);
        });
    }

    remoteStore(uri: IriString, key: number, values: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.solidService
                .getDatasetStore(this.solidService.session, uri)
                .then((store) => {
                    console.log(store, key, values);
                    resolve();
                })
                .catch(reject);
        });
    }
}
