import '@openhps/rdf';
import { DHTNode, LocalDHTNode, LocalRDFNode, NodeID  } from '../models';
import { IriString, RDFSerializer } from '@openhps/rdf';
import { Collection } from '@openhps/solid';
import { DHTMemoryNetwork } from './DHTMemoryNetwork';
import { RemoteRDFNode } from '../models/RemoteRDFNode';

/**
 * Distributed hash table RDF network
 */
export class DHTRDFNetwork extends DHTMemoryNetwork {
    private _defaultURI: IriString;
    protected nodeHandler: RemoteRDFNode;
    protected collection: IriString;
    // Collection object
    private _collection: Collection;

    constructor(collectionURI: IriString, uri?: IriString) {
        super(collectionURI);
        this._defaultURI = uri || collectionURI;
        this._collection = new Collection(collectionURI);
    }

    createLocalNode(nodeID: number): Promise<LocalRDFNode> {
        return new Promise((resolve, reject) => {
            fetch(this._defaultURI).then((response) => {
                return response.text();
            }).then((response) => {
                return RDFSerializer.deserializeFromString(this._defaultURI, response);
            }).then((node) => {
                resolve(node as LocalRDFNode);
            }).catch(() => {
                // Create a new local node
                const node = new LocalRDFNode(nodeID, this);
                resolve(node);
            });
        });
    }

    /**
     * Add a node to the network
     * @param {DHTNode} node Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
            // Add the node in memory and broadcast to nearby other nodes
            this.nodes.set(node.nodeID, this.nodeHandler ? new Proxy(node, this.nodeHandler) : node);

            resolve();
        });
    }

    removeNode(node: DHTNode): Promise<void> {
        return new Promise((resolve, reject) => {
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
}
