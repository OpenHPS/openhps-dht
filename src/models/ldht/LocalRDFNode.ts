import {
    Serializable,
    SerializableArrayMember,
    SerializableMapMember,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { LocalDHTNode } from '../LocalDHTNode';
import { ldht } from '../../terms';
import { IriString, RDFBuilder, Thing, rdf, schema, tree } from '@openhps/rdf';
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
    })
    nodeID: number;
    @SerializableMember()
    collection: string;
    @SerializableMapMember(String, String)
    dataStore?: Map<number, string[]>;
    // Convert to neighbouring nodes with tree relations
    @SerializableMapMember(Number, Array)
    buckets: Map<number, NodeID[]>;
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
                    return this.network.remoteStore(this.uri, key, Array.isArray(value) ? value : [value]);
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
        return new Promise((resolve) => {});
    }
}
