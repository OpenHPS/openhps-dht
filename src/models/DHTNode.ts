export type NodeID = number;

/**
 * DHT Node interface
 */
export interface DHTNode {
    nodeID: number;
    collection: string;

    /**
     * Add a node to the network. This function is executed on the target node.
     * @param {NodeID} nodeID Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(nodeID: NodeID): Promise<void>;

    /**
     * Remove a node from the network. This function is executed on the target node.
     * @param {number} nodeID Node to remove
     * @returns {Promise<void>} Promise when the node is removed
     */
    removeNode(nodeID: NodeID): Promise<void>;

    /**
     * Store a value in the node. This function is executed on the target node.
     * @param {number} key Hashed key
     * @param {string | string[]} value Value to store
     * @param {Set<NodeID>} visitedNodes Visited nodes
     * @param {number} maxHops Maximum hops
     */
    store(key: number, value: string | string[], visitedNodes?: Set<NodeID>, maxHops?: number): Promise<void>;

    /**
     * Check if the node has a value.
     * @param {number} key Key to check
     * @returns {Promise<boolean>} Promise when the value is checked
     */
    hasValue(key: number): Promise<boolean>;

    /**
     * Find a value in the node.
     * @param key
     */
    findValue(key: number): Promise<string[]>;

    /**
     * Ping the node and propagate the ping to other nodes.
     */
    ping(): Promise<void>;
}
