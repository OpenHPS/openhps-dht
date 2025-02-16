import { DataFactory, IriString, RDFSerializer, schema, Store } from '@openhps/rdf';
import { NodeID } from '../DHTNode';
import { RemoteDHTNode } from '../RemoteDHTNode';
import { RDFNode } from './RDFNode';
import { SerializableObject } from '@openhps/core';
import { DHTRDFNetwork } from '../../services/DHTRDFNetwork';
import { LDHTAction } from './LDHTAction';
import { LDHTAddNodeAction } from './LDHTAddNodeAction';
import { LocalRDFNode } from './LocalRDFNode';
import { LDHTRemoveNodeAction } from './LDHTRemoveNodeAction';
import { LDHTStoreValueAction } from './LDHTStoreValueAction';
import { LDHTEntry } from './LDHTEntry';
import { LDHTPingAction } from './LDHTPingAction';

@SerializableObject()
export class RemoteRDFNode extends RemoteDHTNode implements RDFNode {
    uri?: IriString;
    actions?: LDHTAction[];
    dataUri: IriString;
    nodesUri: IriString;
    network: DHTRDFNetwork;

    addNode(nodeID: NodeID): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Do not add itself
            if (nodeID === this.nodeID) {
                return resolve();
            }
            
            try {
                // Send an add node action
                const action = new LDHTAddNodeAction();
                action.actionStatus = schema.PotentialActionStatus;
                action.agent = (this.network.node as LocalRDFNode).uri;
                action.object = (await this.network.findNodeById(nodeID) as RemoteRDFNode).uri;
                this.createAction(action).then(() => {
                    resolve();
                }).catch(reject);
            } catch (e) {
                console.log(e);
            }
        });
    }

    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Send a remove node action
            const action = new LDHTRemoveNodeAction();
            action.actionStatus = schema.PotentialActionStatus;
            action.agent = (this.network.node as LocalRDFNode).uri;
            action.object = (await this.network.findNodeById(nodeID) as LocalRDFNode).uri;
            this.createAction(action).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    store(key: number, value: string | string[], visitedNodes?: Set<NodeID>, maxHops?: number): Promise<void> {
        return new Promise((resolve, reject) => {
            // Send a store action to another node
            const action = new LDHTStoreValueAction();
            action.actionStatus = schema.PotentialActionStatus;
            action.agent = (this.network.node as LocalRDFNode).uri;
            const entry = new LDHTEntry();
            entry.identifier = key;
            // Value is an URI leading to the data
            entry.value = value as IriString;
            action.object = entry;
            this.createAction(action).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    hasValue(key: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Access the online sources to determine if the collection contains the data
            this.fetchRemoteNode().then((node) => {
                return node.hasValue(key);
            }).then(resolve).catch(reject);
        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const service = this.network.solidService;
            const session = service.session;
            // Find the key in the collection online
            this.fetchRemoteNode().then((node) => {
                console.log("Finding value", key, node);
            }).catch(reject);
        });
    }

    protected fetchRemoteNode(): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            this.network.solidService.getDatasetStore(this.network.solidService.session, this.uri)
                .then((store) => {
                    return RDFSerializer.deserializeFromStore(DataFactory.namedNode(this.uri), store);
                }).then((data: LocalRDFNode) => {
                    this.actions = data.actions;
                    return data.fetch();
                }).then((data: LocalRDFNode) => {
                    resolve(data);
                })
                .catch(reject);
        });
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Send a ping action to the node
            const action = new LDHTPingAction();
            action.actionStatus = schema.PotentialActionStatus;
            action.agent = (this.network.node as LocalRDFNode).uri;
            action.timeout = 60000;
            this.createAction(action).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    protected createAction<T extends LDHTAction>(action: T): Promise<T> {
        return new Promise((resolve, reject) => {
            const service = this.network.solidService;
            const session = service.session;

            function getActionStatus(actionUri: IriString): Promise<IriString> {
                return new Promise((resolve, reject) => {
                    service.getDatasetStore(session, actionUri).then((store) => {
                        const action: LDHTAction = RDFSerializer.deserializeFromStore(undefined, store);
                        return resolve(action.actionStatus);
                    }).catch(err => {
                        service.logger('error', `Unable to get action status for ${actionUri}`, err);
                        reject(new Error(`Unable to get action status for ${actionUri}. ${err.message}`));
                    });
                });
            }

            const actionContainer = this.actions.find((a) => a.type === action.type);
            if (!actionContainer) {
                return reject(new Error("Action container not found!"));
            }
            // Random uuidv4
            const timestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
            const uri = `${actionContainer.target}${timestamp}.ttl`;
            action.id = uri as IriString;

            const store = new Store();
            store.addQuads(RDFSerializer.serializeToQuads(action));
            service.saveDataset(session, uri, store, true).then((dataset) => {
                action.id = (dataset as any).internal_resourceInfo.sourceIri;

                // Await the action to be saved
                const interval = setInterval(() => {
                    getActionStatus(action.id as IriString).then((status) => {
                        if (status === schema.CompletedActionStatus) {
                            clearInterval(interval);
                            resolve(action);
                        } else if (status === schema.FailedActionStatus) {
                            clearInterval(interval);
                            reject(new Error("Action failed"));
                        } else if (status === schema.PotentialActionStatus || status === schema.ActiveActionStatus) {
                            // Action is still active
                        }
                    }).catch(reject);
                }, 1000);
                // Create a timeout
                setTimeout(() => {
                    clearInterval(interval);
                    reject(new Error("Action timed out"));
                }, action.timeout ?? 30000);
            }).catch(reject);
        });
    }
}
