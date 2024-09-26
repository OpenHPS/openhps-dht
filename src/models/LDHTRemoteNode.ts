import { SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../terms';
import { RemoteDHTNode } from './RemoteDHTNode';
import { NodeID } from './DHTNode';

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
