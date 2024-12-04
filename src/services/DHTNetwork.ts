import { Model } from '@openhps/core';
import { DHTNode, LocalDHTNode, NodeID } from '../models';
import { DHTService } from './DHTService';

/**
 * Distributed Hash Table Network
 */
export abstract class DHTNetwork {
    private _node: LocalDHTNode;
    private _service: DHTService;
    /**
     * Collection name identifying the network
     */
    protected collection: string;
    
    /**
     * Get the local node that is part of the network
     */
    get node(): LocalDHTNode {
        return this._node;
    }
    /**
     * Set the local node that is part of the network
     */
    set node(node: LocalDHTNode) {
        this._node = node;
    }

    /**
     * Get the node identifier
     */
    get nodeID(): NodeID {
        return this.node.nodeID;
    }

    /**
     * Get the service
     */
    get service(): DHTService {
        return this._service;
    }

    /**
     * Set the service
     */
    set service(service: DHTService) {
        this._service = service;
    }

    constructor(collection: string = "default") {
        this.collection = collection
    }

    /**
     * Initialize the network
     * @param nodeID Node identifier to use as the local node
     * @param model Model to use
     * @returns {Promise<void>} Promise when the network is initialized
     */
    initialize(nodeID: number, model?: Model): Promise<void> {
        return new Promise((resolve, reject) => {
            this.createLocalNode(nodeID).then((node) => {
                this.node = node;
                return this.addNode(this.node);
            }).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    /**
     * Get the current node
     * @param {NodeID} nodeID Node ID
     * @returns {Promise<LocalDHTNode>} Node
     */
    abstract createLocalNode(nodeID: number): Promise<LocalDHTNode>;

    protected xorDistance(a: NodeID, b: NodeID): number {
        return Math.abs(a ^ b);
    }

    /**
     * Add a node to the network
     * @param {DHTNode} node Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    abstract addNode(node: DHTNode): Promise<void>;
    /**
     * Remove a node from the network
     * @param {DHTNode} node Node to remove
     */
    abstract removeNode(node: DHTNode): Promise<void>;
    /**
     * Find node by node ID
     * @param {NodeID} nodeID Node ID to find
     * @returns {Promise<DHTNode>} Node found
     */
    abstract findNodeById(nodeID: NodeID): Promise<DHTNode>;
    /**
     * Find node by key
     * @param {number} key Key to find
     * @param {number} count Number of nodes to find
     * @returns {Promise<DHTNode>} Node found
     */
    abstract findNodesByKey(key: number, count?: number): Promise<DHTNode[]>;
    /**
     * Find value by key
     * @param {number} key Key to find
     * @returns {Promise<string[]>} Value found or empty array
     */
    abstract findValue(key: number): Promise<string[]>;
    /**
     * Store a value
     * @param {number} key Key to store
     * @param {string} value Value to store
     * @returns {Promise<void>} Promise when the value is stored
     */
    abstract storeValue(key: number, value: string): Promise<void>;
    /**
     * Ping the network
     * @returns {Promise<void>} Promise when the network is pinged
     */
    abstract ping(): Promise<void>;
}
