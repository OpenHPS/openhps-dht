type IriString = `${'http' | 'https'}://${string}`;
type Property = IriString; // eslint-disable-line
type Class = IriString; // eslint-disable-line
type Datatype = IriString; // eslint-disable-line
type OwlClass = IriString; // eslint-disable-line
type OwlObjectProperty = IriString; // eslint-disable-line
type OwlDatatypeProperty = IriString; // eslint-disable-line
type HydraResource = IriString; // eslint-disable-line
type HydraClass = IriString; // eslint-disable-line
type HydraLink = IriString; // eslint-disable-line
type HydraTemplatedLink = IriString; // eslint-disable-line
type HydraVariableRepresentation = IriString; // eslint-disable-line
type OtherIndividual = IriString; // eslint-disable-line

/**
 * Node
 * 
 * A dht:Node is a node in a distributed hash tree that may contain relations to other nodes in the distributed hash tree.
 *
 * http://purl.org/ldht/Node
 */
export const Node: OwlClass = 'http://purl.org/ldht/Node';

/**
 * Add node action
 * 
 * The act of indicating to a node that a new node has joined the network.
 *
 * http://purl.org/ldht/AddNodeAction
 */
export const AddNodeAction: OwlClass = 'http://purl.org/ldht/AddNodeAction';

/**
 * Ping action
 * 
 * The act of pinging a node to request if it is still active and responding to actions.
 *
 * http://purl.org/ldht/PingAction
 */
export const PingAction: OwlClass = 'http://purl.org/ldht/PingAction';

/**
 * Remove node action
 * 
 * The act of indicating to a node that another node is removed in the network.
 *
 * http://purl.org/ldht/RemoveNodeAction
 */
export const RemoveNodeAction: OwlClass = 'http://purl.org/ldht/RemoveNodeAction';

/**
 * Store value action
 * 
 * The act of storing a value in a node.
 *
 * http://purl.org/ldht/StoreValueAction
 */
export const StoreValueAction: OwlClass = 'http://purl.org/ldht/StoreValueAction';

/**
 * node identifier
 * 
 * The node identifier is a number generated by using the hash algorithm of the network.
 *
 * http://purl.org/ldht/nodeID
 */
export const nodeID: OwlDatatypeProperty = 'http://purl.org/ldht/nodeID';

/**
 * timeout
 * 
 * The timeout is the time in milliseconds that a node will wait for a response from another node.
 *
 * http://purl.org/ldht/timeout
 */
export const timeout: OwlDatatypeProperty = 'http://purl.org/ldht/timeout';

export const _BASE: IriString = 'http://purl.org/ldht/';
export const _PREFIX: string = 'ldht';