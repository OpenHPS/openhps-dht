import {
    NumberType,
    Serializable,
    SerializableArrayMember,
    SerializableMapMember,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { LocalDHTNode } from '../LocalDHTNode';
import { ldht } from '../../terms';
import { DataFactory, IriString, RDFBuilder, RDFSerializer, SerializableThing, Store, Thing, rdf, schema, tree } from '@openhps/rdf';
import { NodeID } from '../DHTNode';
import { RDFNode } from './RDFNode';
import { DHTRDFNetwork } from '../../services';
import { LDHTAction } from './LDHTAction';import { Collection, Node, Relation } from '@openhps/solid';
import { LDHTEntry } from './LDHTEntry';

@SerializableObject({
    rdf: {
        type: ldht.Node,
        serializer: (value: LocalRDFNode) => {
            return {
                termType: 'NamedNode',
                value: value.uri,
            } as Partial<Thing>;
        },
    },
})
export class LocalRDFNode extends LocalDHTNode implements RDFNode {
    @SerializableMember({
        rdf: {
            predicate: ldht.nodeID,
        },
        numberType: NumberType.INTEGER,
    })
    nodeID: number;
    @SerializableMember({
        rdf: {
            identifier: true,
        },
    })
    uri: IriString;
    @SerializableArrayMember(LDHTAction, {
        rdf: {
            predicate: schema.potentialAction,
        },
    })
    actions: LDHTAction[];
    @SerializableMember({
        rdf: {
            predicate: tree.relation,
            serializer: (value: LocalRDFNode) => {
                // Create a TREE relation referencing the data
                return RDFBuilder.blankNode()
                    .add(rdf.type, tree.Relation)
                    .add(tree.node, value.dataUri)
            }
        }
    })
    dataUri: IriString;
    nodesUri: IriString;
    network: DHTRDFNetwork;

    protected storeLocal(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            super
                .storeLocal(key, value)
                .then(() => {
                    // Store in solid storage
                    const service = this.network.solidService;
                    const session = service.session;
                    return service.getDatasetStore(session, this.uri);
                }).then((store) => {
                    const data =  Array.isArray(value) ? value : [value];
                })
                .then(resolve)
                .catch(reject);
        });
    }

    get collectionObject(): Collection {
        const collection = new Collection(this.collection as IriString);
        collection.members = [];
        this.dataStore.forEach((value, key) => {
            value.forEach((v) => {
                const entry = new LDHTEntry();
                entry.identifier = key;
                entry.value = v as IriString;
                collection.members.push(entry);
            });
        });
        return collection;
    }

    findValue(key: number, visitedNodes?: Set<NodeID>, maxHops?: number): Promise<string[]> {
        return new Promise((resolve, reject) => {});
    }

    ping(): Promise<void> {
        return new Promise((resolve, reject) => {

        });
    }

    /**
     * Add a node to the network
     * @param {NodeID} nodeID Node to add
     * @returns {Promise<void>} Promise when the node is added
     */
    addNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            super
                .addNode(nodeID)
                .then(() => {
                    // Save the node to the network
                    return this.saveNodes();
                }).then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    /**
     * Remove a node from the network
     * @param {number} nodeID Node to remove
     * @returns {Promise<void>} Promise when the node is removed
     */
    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve, reject) => {
            super
                .removeNode(nodeID)
                .then(() => {
                    // Save the node to the network
                    return this.saveNodes();
                }).then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    protected saveNodes(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Save the nodes in nodes.ttl
            const uri = this.nodesUri;
            const service = this.network.solidService;
            const session = service.session;
            const collection = new Collection(this.collection + '/nodes/' as IriString);
            this.network.nodes.forEach((node: LocalRDFNode) => {
                if (node.nodeID === this.nodeID) {
                    return;
                }
                collection.members.push(new SerializableThing(node.uri));
            });
            const store = RDFSerializer.serializeToStore(collection);
            service.logger('debug', `Saving nodes to ${uri}`);
            service.saveDataset(session, uri, store).then(() => {
                resolve();
            }).catch(reject);
        });
    }
}
