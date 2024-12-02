import { Serializable, SerializableMapMember, SerializableMember, SerializableObject } from "@openhps/core";
import { LocalDHTNode } from "./LocalDHTNode";
import { ldht } from '../terms';
import { RDFBuilder, IriString, tree, DataFactory, Thing } from '@openhps/rdf';
import { NodeID } from "./DHTNode";
import { SolidSession } from "@openhps/solid";

@SerializableObject({
    rdf: {
        type: ldht.Node
    }
})
export class LocalRDFNode extends LocalDHTNode {
    @SerializableMember({
        rdf: {
            predicate: ldht.nodeID
        }
    })
    nodeID: number;
    @SerializableMember({
        rdf: {
            serializer: (value: LocalDHTNode) => {
                return RDFBuilder.namedNode(value.collection as IriString).build();
            },
        }
    })
    collection: string;
    @SerializableMember({
        rdf: {
            identifier: true,
        }
    })
    locator: string;
    @SerializableMapMember(String, String, {
        rdf: {
            predicate: undefined,
            serializer: (value: Map<number, string[]>, object?: LocalDHTNode) => {
                // Put the data as tree:member's for the collection
                const collection = RDFBuilder.namedNode(object.collection as IriString);
                value.forEach((values, key) => {
                    values.forEach((value) => {
                        collection.add(tree.member, RDFBuilder.blankNode()
                            .add(ldht.key, key)
                            .add(ldht.value, DataFactory.namedNode(value))
                            .build());
                    });
                });
                return collection.build();
            },
            deserializer: (thing: Thing, dataType?: Serializable<any>) => {
                return undefined;
            }
        }
    })
    dataStore?: Map<number, string[]>;
    @SerializableMapMember(Number, Array)
    buckets: Map<number, NodeID[]>;

    // Session of the local node
    session: SolidSession;

    protected storeLocal(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            super.storeLocal(key, value).then(() => {
                // Store in solid storage

                resolve();
            }).catch(reject);
        });
    }

    findValue(key: number, visitedNodes?: Set<NodeID>, maxHops?: number): Promise<string[]> {
        return new Promise((resolve, reject) => {

        });
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
            super.addNode(nodeID).then(() => {
                // Add in RDF store
            }).catch(reject);
        });
    }

    /**
     * Remove a node from the network
     * @param {number} nodeID Node to remove
     * @returns {Promise<void>} Promise when the node is removed
     */
    removeNode(nodeID: NodeID): Promise<void> {
        return new Promise((resolve) => {

        });
    }
}
