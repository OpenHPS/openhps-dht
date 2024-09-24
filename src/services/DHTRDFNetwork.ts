import '@openhps/rdf';
import { DHTNode, LocalDHTNode, NodeID, RemoteDHTNode } from '../models';
import { DHTNetwork } from './DHTNetwork';
import { IriString, RDFSerializer } from '@openhps/rdf';
import { SerializableMember, SerializableObject } from '@openhps/core';
import { ldht } from '../terms';

@SerializableObject({
    rdf: {
        type: ldht.Node
    }
})
class RDFNode extends RemoteDHTNode {
    @SerializableMember({
        rdf: {
            predicate: ldht.nodeID
        }
    })
    nodeID: number;

    addNode(nodeID: NodeID): Promise<void> {
        throw new Error('Method not implemented.');
    }
    removeNode(nodeID: NodeID): Promise<void> {
        throw new Error('Method not implemented.');
    }
    store(key: number, value: string | string[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    hasValue(key: number): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    findValue(key: number): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    ping(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

export class DHTRDFNetwork extends DHTNetwork {
    private _defaultURI: IriString;
    protected nodeHandler: DHTNode;

    constructor(uri: IriString) {
        super();
        this._defaultURI = uri;
    }


    createLocalNode(nodeID: number): Promise<LocalDHTNode> {
        return new Promise((resolve, reject) => {
            fetch(this._defaultURI).then((response) => {
                return response.text();
            }).then((response) => {
                return RDFSerializer.deserializeFromString(this._defaultURI, response);
            }).then((node) => {
                resolve(node as LocalDHTNode);
            }).catch(reject);
        });
    }

    addNode(node: DHTNode): Promise<void> {
        throw new Error('Method not implemented.');
    }

    removeNode(node: DHTNode): Promise<void> {
        throw new Error('Method not implemented.');
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        throw new Error('Method not implemented.');
    }

    findNodesByKey(key: number, count?: number): Promise<DHTNode[]> {
        throw new Error('Method not implemented.');
    }

    findValue(key: number): Promise<string[]> {
        throw new Error('Method not implemented.');
    }

    storeValue(key: number, value: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    ping(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
