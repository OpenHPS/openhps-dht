import { Model } from '@openhps/core';
import { DHTNode, LocalDHTNode, NodeID } from '../models';
import { DHTService } from './DHTService';

/**
 * Distributed Hash Table Network
 */
export abstract class DHTNetwork {
    public nodes: Map<NodeID, DHTNode> = new Map();
    private _node: LocalDHTNode;
    private _service: DHTService;
    protected model: Model;

    /**
     * Collection name identifying the network
     */
    protected collection: string;

    /**
     * Get the local node that is part of the network
     * @returns {LocalDHTNode} Local node
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
     * @returns {NodeID} Node identifier
     */
    get nodeID(): NodeID {
        return this.node.nodeID;
    }

    set nodeID(nodeID: NodeID) {
        this.node.nodeID = nodeID;
    }

    /**
     * Get the service
     * @returns {DHTService} Service
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

    constructor(collection: string = 'default') {
        this.collection = collection;
    }

    /**
     * Set the local node
     * @param {LocalDHTNode} node Node
     */
    setLocalNode(node: LocalDHTNode): this {
        this._node = node;
        return this;
    }

    /**
     * Initialize the network
     * @param nodeID Node identifier to use as the local node
     * @param model Model to use
     * @returns {Promise<void>} Promise when the network is initialized
     */
    initialize(nodeID: number, model?: Model): Promise<void> {
        this.model = model;
        return new Promise((resolve, reject) => {
            this.createLocalNode(nodeID)
                .then((node) => {
                    this.nodes.set(node.nodeID, node);
                    this.node = node;
                    resolve();
                })
                .catch(reject);
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
