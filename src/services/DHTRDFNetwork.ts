import { DataFactory, foaf, IriString, RDFSerializer } from '@openhps/rdf';
import { LocalRDFNode } from '../models/ldht/LocalRDFNode';
import { LDHTAddNodeAction, LDHTPingAction, LDHTRemoveNodeAction, LDHTStoreValueAction } from '../models/ldht';

import { Collection, DatasetSubscription, SolidClientService } from '@openhps/solid';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RemoteRDFNode } from '../models/ldht/RemoteRDFNode';
import { Model } from '@openhps/core';
import { DHTService } from './DHTService';

/**
 * Distributed hash table RDF network
 */
export class DHTRDFNetwork extends DHTMemoryNetwork {
    protected nodeHandler: RemoteRDFNode;
    public solidService: SolidClientService;
    protected collectionInstance: Collection;
    protected podUrl: IriString;
    protected subscription: DatasetSubscription;

    constructor(collectionName?: string, collectionUri?: IriString) {
        super(collectionName);
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
                    }).then((subscription) => {
                        this.subscription = subscription;
                        if (!this.subscription) {
                            throw new Error('Solid Pod does not support Websocket notifications!');
                        }
                        this.service.logger('debug', `Listening for updates on ${this.actionsUri}`);
                        this.subscription.addListener('update', console.log);
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    createLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodesContainer: IriString = this.nodesContainerUri;
            const url: IriString = this.collectionUri;
            const nodeUrl: IriString = this.nodeUri;
            const actionsUrl: IriString = this.actionsUri;

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
                                write: true, // TODO: Fix
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
                    reject(err);
                });
        });
    }

    protected fetchLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodeUrl: IriString = this.nodeUri;
            const nodesUri: IriString = this.nodesUri;
            const dataUri: IriString = this.dataUri;
            const actionsUrl: IriString = this.actionsUri;
            
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
                    return this.solidService.saveDataset(this.solidService.session, nodeUrl, store)
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
                reject(err);
            });
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
