import {
    createChangeLog,
    NumberType,
    SerializableArrayMember,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { LocalDHTNode } from '../LocalDHTNode';
import { ldht } from '../../terms';
import { DataFactory, IriString, RDFBuilder, RDFSerializer, SerializableThing, Store, Thing, rdf, schema, tree } from '@openhps/rdf';
import { NodeID } from '../DHTNode';
import { RDFNode } from './RDFNode';
import { DHTRDFNetwork } from '../../services';
import { LDHTAction } from './LDHTAction';import { Collection } from '@openhps/solid';
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
        deserializer: (value: Thing, instance) => {
            instance.uri = value.value as IriString;
            return instance;
        }
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
            serializer: (value: IriString) => {
                if (!value) {
                    return undefined;
                }
                // Create a TREE relation referencing the data
                return RDFBuilder.blankNode()
                    .add(rdf.type, tree.Relation)
                    .add(tree.node, value)
                    .build();
            },
            deserializer: (value: Thing) => {
                const node = value.predicates[tree.node];
                if (node) {
                    return node[0].value;
                }
                return undefined;
            },
        }
    })
    dataUri: IriString;
    @SerializableMember({
        rdf: {
            predicate: ldht.nodes,
            serializer: (value: IriString) => {
                if (!value) {
                    return undefined;
                }
                return DataFactory.namedNode(value);
            },
            deserializer: (value: IriString) => {
                return value;
            }
        }
    })
    nodesUri: IriString;
    network: DHTRDFNetwork;

    /**
     * Fetch neigbouring nodes and data
     * 
     * @returns 
     */
    fetch(): Promise<this> {
        return new Promise((resolve, reject) => {
            const service = this.network.solidService;
            const session = service.session;     
            service.getDatasetStore(session, this.dataUri).then((store) => {
                return RDFSerializer.deserializeFromStore(undefined, store);
            }).then((collection: Collection) => {
                this.collectionObject = collection;
                return service.getDatasetStore(session, this.nodesUri);
            }).then((store) => {
                return RDFSerializer.deserializeFromStore(undefined, store);
            }).then((collection: Collection) => {
                resolve(this);
            }).catch(reject);
        });
    }

    protected storeLocal(key: number, value: string | string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const service = this.network.solidService;
            const session = service.session;
            super
                .storeLocal(key, value)
                .then(() => {
                    // Store in solid storage
                    return service.getDatasetStore(session, this.dataUri);
                }).then((store) => {
                    const collection: Collection = createChangeLog(RDFSerializer.deserializeFromStore(undefined, store) ?? new Collection(this.dataUri));
                    const data =  Array.isArray(value) ? value : [value];
                    data.forEach((v) => {
                        const entry = new LDHTEntry();
                        entry.identifier = key;
                        entry.value = v as IriString;
                        collection.members.push(entry);
                    });
                    const changelog = RDFSerializer.serializeToChangeLog(collection);
                    store.addQuads(changelog.additions);
                    store.removeQuads(changelog.deletions);
                    console.log("Saving data to", this.dataUri, changelog.additions);
                    return service.saveDataset(session, this.dataUri, store);
                })
                .then(() => {
                    resolve();
                })
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

    set collectionObject(collection: Collection) {
        if (collection && collection.members) {
            collection.members.forEach((entry: LDHTEntry) => {
                const key = entry.identifier;
                const value = entry.value;
                if (!this.dataStore.has(key)) {
                    this.dataStore.set(key, []);
                }
                this.dataStore.get(key)!.push(value);
            });
        }
    }

    findValue(key: number, visitedNodes?: Set<NodeID>, maxHops?: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            super.findValue(key, visitedNodes, maxHops).then((values) => {
                resolve(values);
            }).catch(reject);
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
            let nodesStore: Store = new Store();
            service.getDatasetStore(session, uri).then((store) => {
                nodesStore = store;
                return RDFSerializer.deserializeFromStore(undefined, store);
            }).then((collection: Collection) => {
                if (!collection) {
                    collection = new Collection(this.collection + '/nodes/' as IriString);
                }
                collection = createChangeLog(collection);
                this.network.nodes.forEach((node: LocalRDFNode) => {
                    if (node.nodeID === this.nodeID) {
                        return;
                    }
                    collection.members.push(new SerializableThing(node.uri));
                });
                const changelog = RDFSerializer.serializeToChangeLog(collection);
                service.logger('debug', `Saving nodes to ${uri}`);
                nodesStore.addQuads(changelog.additions);
                nodesStore.removeQuads(changelog.deletions);
                return service.saveDataset(session, uri, nodesStore);
            }).then(() => {
                resolve();
            }).catch(reject);
        });
    }
}
