import { Action, IriString, RDFSerializer, schema } from '@openhps/rdf';
import { NodeID } from '../DHTNode';
import { RemoteDHTNode } from '../RemoteDHTNode';
import { RDFNode } from './RDFNode';
import { SerializableArrayMember, SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../../terms';
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
    @SerializableMember()
    uri: IriString;
    @SerializableArrayMember(LDHTAction)
    actions: LDHTAction[];
    dataUri: IriString;
    nodesUri: IriString;
    network: DHTRDFNetwork;

    addNode(nodeID: NodeID): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Send an add node action
            const action = new LDHTAddNodeAction();
            action.actionStatus = schema.PotentialActionStatus;
            action.agent = (this.network.node as LocalRDFNode).uri;
            action.object = (await this.network.findNodeById(nodeID) as LocalRDFNode).uri;
            this.createAction(action).then(() => {
                resolve();
            }).catch(reject);
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

    store(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            // Send a store action to another node
            const action = new LDHTStoreValueAction();
            action.actionStatus = schema.PotentialActionStatus;
            action.agent = (this.network.node as LocalRDFNode).uri;
            const entry = new LDHTEntry();
            entry.identifier = key;
            action.object = entry;
            this.createAction(action).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    hasValue(key: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Access the online sources to determine if the collection contains the data
            console.log("checking if has value");
        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            // Find the key in the collection online
            this.fetchRemoteNode().then((node) => {
                console.log(node);
            }).catch(reject);
        });
    }

    protected fetchRemoteNode(): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            fetch(this.uri)
                .then((response) => {
                    return response.text();
                })
                .then((text) => {
                    return RDFSerializer.deserializeFromString(this.uri, text);
                }).then(resolve)
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

    protected createAction<T extends Action>(action: T): Promise<T> {
        return new Promise((resolve, reject) => {
            console.log(this.uri);

            resolve(action);
        });
    }
}
