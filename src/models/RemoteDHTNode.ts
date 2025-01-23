import { DHTNode, NodeID } from './DHTNode';

/**
 * Proxy handler for a remote DHT node
 */
export abstract class RemoteDHTNode implements DHTNode, ProxyHandler<DHTNode> {
    collection: string;
    nodeID: number;

    get?(target: DHTNode, p: PropertyKey, receiver: any): any {
        switch (p) {
            case 'nodeID':
                return this.nodeID;
            case 'addNode':
                return this.addNode.bind(this);
            case 'removeNode':
                return this.removeNode.bind(this);
            case 'store':
                return this.store.bind(this);
            case 'hasValue':
                return this.hasValue.bind(this);
            case 'findValue':
                return this.findValue.bind(this);
            case 'ping':
                return this.ping.bind(this);
            default:
                return Reflect.get(target, p, receiver);
        }
    }

    /**
     * Add a node to the network. This function is executed on the target node.
     * @param {NodeID} nodeID Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    abstract addNode(nodeID: NodeID): Promise<void>;

    /**
     * Remove a node from the network. This function is executed on the target node.
     * @param {number} nodeID Node to remove
     * @returns {Promise<void>} Promise when the node is removed
     */
    abstract removeNode(nodeID: NodeID): Promise<void>;

    /**
     * Store a value in the node. This function is executed on the target node.
     * @param {number} key Hashed key
     * @param {string | string[]} value Value to store
     */
    abstract store(key: number, value: string | string[]): Promise<void>;

    /**
     * Check if the node has a value.
     * @param {number} key Key to check
     * @returns {Promise<boolean>} Promise when the value is checked
     */
    abstract hasValue(key: number): Promise<boolean>;

    /**
     * Find a value in the node.
     * @param key
     */
    abstract findValue(key: number): Promise<string[]>;

    /**
     * Ping the node and propagate the ping to other nodes.
     */
    abstract ping(): Promise<void>;
}
