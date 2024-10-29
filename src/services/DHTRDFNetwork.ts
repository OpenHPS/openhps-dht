import '@openhps/rdf';
import { DHTNode, LocalDHTNode, NodeID  } from '../models';
import { DHTNetwork } from './DHTNetwork';
import { IriString, RDFSerializer } from '@openhps/rdf';

/**
 * Distributed hash table RDF network
 */
export class DHTRDFNetwork extends DHTNetwork {
    private _defaultURI: IriString;
    protected nodeHandler: DHTNode;

    constructor(collectionURI: IriString, uri?: IriString) {
        super(collectionURI);
        this._defaultURI = uri || collectionURI;
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

    /**
     * Add a node to the network
     * @param {DHTNode} node Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {

        });
    }

    removeNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {

        });
    }

    findNodeById(nodeID: NodeID): Promise<DHTNode> {
        return new Promise((resolve, reject) => {

        });
    }

    findNodesByKey(key: number, count?: number): Promise<DHTNode[]> {
        return new Promise((resolve, reject) => {

        });
    }

    findValue(key: number): Promise<string[]> {
        return new Promise((resolve, reject) => {

        });
    }

    storeValue(key: number, value: string): Promise<void> {
        return new Promise((resolve, reject) => {

        });
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }
}
