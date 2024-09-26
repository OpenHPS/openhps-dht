import { SerializableMapMember, SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../terms';
import { RemoteDHTNode } from './RemoteDHTNode';
import { NodeID } from './DHTNode';
import { LDHTAction } from './LDHTAction';
import { IriString, schema } from '@openhps/rdf';

@SerializableObject({
    rdf: {
        type: ldht.Node
    }
})
export class LDHTRemoteNode extends RemoteDHTNode {
    @SerializableMember({
        rdf: {
            predicate: ldht.nodeID
        }
    })
    nodeID: number;
    @SerializableMapMember(String, String, {
        rdf: {
            predicate: schema.potentialAction
        }
    })
    actions: Map<IriString, IriString> = new Map();

    createAction(action: LDHTAction): Promise<void> {
        return new Promise((resolve, reject) => {
            const container = this.actions.get(action.type);
            if (!container) {
                return reject(new Error('Action not supported'));
            }
            
        });
    }

    addNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    store(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    hasValue(key: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            
        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            
        });
    }
    
    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

}
