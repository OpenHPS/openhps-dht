import '@openhps/rdf';
import { DHTNode, LDHTAddNodeAction, LDHTPingAction, LDHTRemoveNodeAction, LDHTStoreValueAction, LocalRDFNode, NodeID  } from '../models';
import { foaf, IriString, RDFSerializer } from '@openhps/rdf';
import { Collection, SolidClientService } from '@openhps/solid';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RemoteRDFNode } from '../models/RemoteRDFNode';
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
     * @param nodeID Node identifier to use as the local node
     * @param model Model to use
     * @returns {Promise<void>} Promise when the network is initialized
     */
    initialize(nodeID: number, model?: Model): Promise<void> {
        return new Promise((resolve, reject) => {
            // Get the Solid service of the node
            if (model) {
                this.solidService = model.findService(SolidClientService);
            } else {
                reject(new Error("No positioning model found"));
            }

            if (!this.solidService) {
                reject(new Error("No Solid service found in the model"));
            }

            if (!this.service) {
                reject(new Error("Network was created without a service"));
            }

            this.solidService.once('ready', () => {
                if (!this.solidService.session) {
                    reject(new Error("No Solid session found in the service"));
                }
    
                this.solidService.getPodUrl(this.solidService.session).then((podUrl) => {
                    this.podUrl = podUrl;
                }).then(() => {
                    return super.initialize(nodeID, model);
                }).then(() => {
                    resolve();
                }).catch(reject);
            });
        });
    }

    createLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            const nodesContainer: IriString = `${this.podUrl}/nodes`;
            const url: IriString = `${nodesContainer}/${this.collection}`;
            const nodeUrl: IriString = `${url}/node.ttl#`;
            const actionsUrl: IriString = `${url}/actions`;

            this.service.logger('debug', `Creating 'nodes' container at ${nodesContainer}`);
            this.solidService.createContainer(this.solidService.session, nodesContainer).then(() => {
                this.service.logger('debug', `Creating 'collection' container at ${url}`);
                return this.solidService.createContainer(this.solidService.session, `${url}`);
            }).then(() => {
                this.service.logger('debug', `Creating 'actions' container at ${actionsUrl}`);
                return this.solidService.createContainer(this.solidService.session, `${actionsUrl}`);
            }).then(() => {
                // Ensure that the acl rights for "url" are read only
                // Ensure that the acl rights for "actionsUrl" are read and append
                this.service.logger('debug', `Setting access rights for ${url}`);
                return Promise.all([
                    this.solidService.setAccess(url, {
                        read: true,
                        write: false,
                        append: false,
                        controlRead: false,
                        controlWrite: false,
                    }, foaf.Agent, this.solidService.session),
                    this.solidService.setAccess(actionsUrl, {
                        read: true,
                        write: false,
                        append: true,
                        controlRead: false,
                        controlWrite: false,
                    }, foaf.Agent, this.solidService.session)
                ]);
            }).then(() => {
                this.service.logger('debug', `Fetching node at ${nodeUrl}`);
                return fetch(nodeUrl);
            }).then((response) => {
                return response.text();
            }).then((response) => {
                return RDFSerializer.deserializeFromString(nodeUrl, response);
            }).then((node: LocalRDFNode) => {
                resolve(node as LocalRDFNode);
            }).catch((err) => {
                console.error(err);
                // Create a new local node
                this.service.logger('debug', `Creating new local node at ${nodeUrl}`);
                const node = new LocalRDFNode(nodeID, this);
                node.uri = nodeUrl;
                node.actions = [
                    new LDHTPingAction()
                        .setTarget(actionsUrl as IriString),
                    new LDHTAddNodeAction()
                        .setTarget(actionsUrl as IriString),
                    new LDHTRemoveNodeAction()
                        .setTarget(actionsUrl as IriString),
                    new LDHTStoreValueAction()
                        .setTarget(actionsUrl as IriString),
                ];
                // Store node
                this.solidService.saveDatasetStore(this.solidService.session, nodeUrl, RDFSerializer.serializeToStore(node))
                    .then(() => {
                        resolve(node);
                    }).catch(reject);
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

            resolve();
        });
    }

    removeNode(node: RemoteRDFNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Delete node locally
            this.nodes.delete(node.nodeID);

            resolve();
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
            let foundValue: string[] = [];
            this.findNodesByKey(key)
                .then((closestNodes) => {
                    if (closestNodes.length > 0) {

                    }
                })
                .catch(reject);
        });
    }

    storeValue(key: number, value: string): Promise<void> {
        return super.storeValue(key, value);
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    remoteStore(uri: IriString, key: number, values: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.solidService.getDatasetStore(this.solidService.session, uri).then((store) => {

            }).catch(reject);
        });
    }
}
