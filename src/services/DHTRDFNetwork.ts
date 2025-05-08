import { DataFactory, foaf, IriString, RDFSerializer, schema } from '@openhps/rdf';
import { LocalRDFNode } from '../models/ldht/LocalRDFNode';
import {
    LDHTAction,
    LDHTAddNodeAction,
    LDHTPingAction,
    LDHTRemoveNodeAction,
    LDHTStoreValueAction,
} from '../models/ldht';

import { Activity, Collection, DatasetSubscription, SolidClientService } from '@openhps/solid';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RemoteRDFNode } from '../models/ldht/RemoteRDFNode';
import { createChangeLog, Model } from '@openhps/core';
import { DHTService } from './DHTService';
import { DHTNode } from '../models/DHTNode';

/**
 * Distributed hash table RDF network
 */
export class DHTRDFNetwork extends DHTMemoryNetwork {
    protected nodeHandler: RemoteRDFNode;
    public solidService: SolidClientService;
    protected collectionInstance: Collection;
    protected podUrl: IriString;
    protected subscription: DatasetSubscription;
    
    constructor(collectionUri?: IriString, collectionAlias?: string) {
        super(collectionAlias);
        this.collectionInstance = new Collection(collectionUri);
        this.nodeHandler = new RemoteRDFNode();
    }

    set service(service: DHTService) {
        super.service = service;
        service.dependencies.push(SolidClientService);
    }

    get service(): DHTService {
        return super.service;
    }

    private get nodesContainerUri(): IriString {
        return this.podUrl.endsWith('/') ? `${this.podUrl}nodes/` : `${this.podUrl}/nodes/`;
    }

    private get collectionUri(): IriString {
        const nodesContainer: IriString = this.nodesContainerUri;
        return `${nodesContainer}${this.collection}/`;
    }

    private get actionsUri(): IriString {
        const url: IriString = this.collectionUri;
        return `${url}actions/`;
    }

    private get nodeUri(): IriString {
        const url: IriString = this.collectionUri;
        return `${url}node.ttl`;
    }

    private get nodesUri(): IriString {
        const url: IriString = this.collectionUri;
        return `${url}nodes.ttl`;
    }

    private get dataUri(): IriString {
        const url: IriString = this.collectionUri;
        return `${url}data.ttl`;
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
                        // Listen for actions
                        return this.solidService.getDatasetSubscription(this.solidService.session, this.actionsUri);
                    })
                    .then((subscription) => {
                        this.subscription = subscription;
                        if (!this.subscription) {
                            throw new Error('Solid Pod does not support Websocket notifications!');
                        }
                        this.service.logger('debug', `Listening for updates on ${this.actionsUri}`);
                        this.subscription.addListener('activity', this.onAction.bind(this));
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    onAction(activity: Activity): void {
        const object = activity.object;
        if (object) {
            // Handle actions
            this.solidService
                .getDatasetStore(this.solidService.session, object)
                .then((store) => {
                    let action: LDHTAction = RDFSerializer.deserializeFromStore(undefined, store);
                    if (action) {
                        this.service.logger('debug', `Received (${action.constructor.name}) action: ${object}`);
                        if (action instanceof LDHTAddNodeAction) {
                            // Add a node
                            // Fetch the remote node first
                            this.fetchRemoteNode(action.object)
                                .then((node) => {
                                    // Note: possible race condition if nodes are waiting for each other
                                    return this.addNode(node, true);
                                })
                                .then(() => {
                                    // Set action completed
                                    action = createChangeLog(action);
                                    action.actionStatus = schema.CompletedActionStatus;
                                    const changes = RDFSerializer.serializeToChangeLog(action);
                                    store.additions = changes.additions;
                                    store.deletions = changes.deletions;
                                    this.service.logger('debug', `Updating action status to completed for: ${object}`);
                                    return this.solidService.saveDataset(this.solidService.session, object, store);
                                })
                                .catch((err) => {
                                    this.service.logger('error', `Failed to fetch remote node: ${err.message}`);
                                });
                        } else if (action instanceof LDHTRemoveNodeAction) {
                            // Remove a node
                            // Fetch the remote node first
                            this.fetchRemoteNode(action.object)
                                .then((node) => {
                                    return this.removeNode(node);
                                })
                                .then(() => {
                                    // Set action completed
                                    action = createChangeLog(action);
                                    action.actionStatus = schema.CompletedActionStatus;
                                    const changes = RDFSerializer.serializeToChangeLog(action);
                                    store.additions = changes.additions;
                                    store.deletions = changes.deletions;
                                    this.service.logger('debug', `Updating action status to completed for: ${object}`);
                                    return this.solidService.saveDataset(this.solidService.session, object, store);
                                })
                                .catch((err) => {
                                    this.service.logger('error', `Failed to fetch remote node: ${err.message}`);
                                });
                        } else if (action instanceof LDHTStoreValueAction) {
                            // Store a value
                            this.storeValue(action.object.identifier, action.object.value)
                                .then(() => {
                                    // Set action completed
                                    action = createChangeLog(action);
                                    action.actionStatus = schema.CompletedActionStatus;
                                    const changes = RDFSerializer.serializeToChangeLog(action);
                                    store.additions = changes.additions;
                                    store.deletions = changes.deletions;
                                    this.service.logger('debug', `Updating action status to completed for: ${object}`);
                                    return this.solidService.saveDataset(this.solidService.session, object, store);
                                })
                                .catch((err) => {
                                    this.service.logger('error', `Failed to store value: ${err.message}`);
                                });
                        }
                    }
                })
                .catch((err) => {
                    this.service.logger('error', `Failed to deserialize action: ${err.message}`);
                });
        }
    }

    createLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodesContainer: IriString = this.nodesContainerUri;
            const url: IriString = this.collectionUri;
            const nodeUrl: IriString = this.nodeUri;
            const actionsUrl: IriString = this.actionsUri;

            if (this.node) {
                // Node already exists
                const localNode: LocalRDFNode = this.node as LocalRDFNode;
                this.nodeID = localNode.nodeID;
                localNode.fetch()
                    .then(() => {
                        resolve(localNode);
                    })
                    .catch(reject);
            }

            this.service.logger('debug', `Creating 'nodes' container at ${nodesContainer}`);
            this.solidService
                .createContainer(this.solidService.session, nodesContainer)
                .then(() => {
                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 1000);
                    });
                })
                .then(() => {
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
                })
                .then(() => {
                    // Ensure that the acl rights for "url" are read only
                    // Ensure that the acl rights for "actionsUrl" are read and append
                    this.service.logger('debug', `Setting access rights for ${url}`);
                    return Promise.all([
                        this.solidService.setAccess(
                            url,
                            {
                                read: true,
                                public: true,
                                group: true,
                            },
                            foaf.Agent,
                            this.solidService.session,
                        ),
                        this.solidService.setAccess(
                            actionsUrl,
                            {
                                read: true,
                                append: true,
                                public: true,
                                default: true,
                                group: true,
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
                .catch((err) => {
                    reject(err);
                });
        });
    }

    storeValue(key: number, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            super
                .storeValue(key, value)
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.service.logger('debug', `Finding value for key ${key} in network`);
            super
                .findValue(key)
                .then((values) => {
                    resolve(values);
                })
                .catch(reject);
        });
    }

    addNode(node: DHTNode, skip?: boolean): Promise<void> {
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
                    const promise = Promise.all(
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
                    if (!skip) {
                        return promise.then(() => {
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                })
                .catch(reject);
        });
    }

    protected fetchRemoteNode(uri: IriString): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            this.solidService
                .getDatasetStore(this.solidService.session, uri)
                .then((store) => {
                    return RDFSerializer.deserializeFromStore(DataFactory.namedNode(uri), store);
                })
                .then((data: LocalRDFNode) => {
                    resolve(data);
                })
                .catch(reject);
        });
    }

    protected fetchLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodeUrl: IriString = this.nodeUri;
            const nodesUri: IriString = this.nodesUri;
            const dataUri: IriString = this.dataUri;
            const actionsUrl: IriString = this.actionsUri;

            let node: LocalRDFNode;

            this.solidService
                .getDatasetStore(this.solidService.session, nodeUrl)
                .then((store) => {
                    node = RDFSerializer.deserializeFromStore(DataFactory.namedNode(nodeUrl), store);
                    if (!node) {
                        // Create a new local node
                        this.service.logger('debug', `Creating new local node at ${nodeUrl}`);
                        node = new LocalRDFNode(nodeID, this);
                        node.uri = nodeUrl;
                        node.dataUri = dataUri;
                        node.nodesUri = nodesUri;
                        node.collection = this.collectionInstance.id;
                        node.actions = [
                            new LDHTPingAction().setTarget(actionsUrl as IriString),
                            new LDHTAddNodeAction().setTarget(actionsUrl as IriString),
                            new LDHTRemoveNodeAction().setTarget(actionsUrl as IriString),
                            new LDHTStoreValueAction().setTarget(actionsUrl as IriString),
                        ];
                        // Store node
                        const quads = RDFSerializer.serializeToQuads(node);
                        store.addQuads(quads);
                        return this.solidService.saveDataset(this.solidService.session, nodeUrl, store);
                    } else {
                        node.network = this;
                        node.collection = this.collectionInstance.id;
                        this.service.logger('debug', `Local node already exists at ${nodeUrl}, fetching data ...`);
                        node.fetch()
                            .then(() => {
                                resolve(node);
                            })
                            .catch(reject);
                    }
                })
                .then(() => {
                    this.service.logger('debug', `Setting access rights for ${nodeUrl}`);
                    return this.solidService.setAccess(
                        nodeUrl,
                        {
                            read: true,
                            public: true,
                            group: true,
                        },
                        foaf.Agent,
                        this.solidService.session,
                    );
                })
                .then(() => {
                    // Create the nodes and data store
                    this.service.logger('debug', `Creating nodes store at ${nodesUri}`);
                    this.service.logger('debug', `Creating data store at ${dataUri}`);
                    return Promise.all([
                        this.solidService.getDataset(this.solidService.session, nodesUri),
                        this.solidService.getDataset(this.solidService.session, dataUri),
                    ]);
                })
                .then((datasets) => {
                    const nodesExists = datasets[0] !== undefined;
                    const dataExists = datasets[1] !== undefined;
                    const promises = [];
                    if (!nodesExists) {
                        promises.push(
                            this.solidService.saveDataset(
                                this.solidService.session,
                                nodesUri,
                                this.solidService.createDataset(),
                            ),
                        );
                    }
                    if (!dataExists) {
                        promises.push(
                            this.solidService.saveDataset(
                                this.solidService.session,
                                dataUri,
                                this.solidService.createDataset(),
                            ),
                        );
                    }
                    return Promise.all(promises);
                })
                .then(() => {
                    this.service.logger('debug', `Setting access rights for ${nodesUri}`);
                    this.service.logger('debug', `Setting access rights for ${dataUri}`);
                    return Promise.all([
                        this.solidService.setAccess(
                            nodesUri,
                            {
                                read: true,
                                public: true,
                                group: true,
                            },
                            foaf.Agent,
                            this.solidService.session,
                        ),
                        this.solidService.setAccess(
                            dataUri,
                            {
                                read: true,
                                public: true,
                                group: true,
                            },
                            foaf.Agent,
                            this.solidService.session,
                        ),
                    ]);
                })
                .then(() => {
                    resolve(node);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
