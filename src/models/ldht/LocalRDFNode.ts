import {
    createChangeLog,
    NumberType,
    SerializableArrayMember,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { LocalDHTNode } from '../LocalDHTNode';
import { ldht } from '../../terms';
import {
    DataFactory,
    IriString,
    NamedNode,
    RDFBuilder,
    RDFSerializer,
    SerializableThing,
    Store,
    Thing,
    rdf,
    schema,
    tree,
} from '@openhps/rdf';
import { NodeID } from '../DHTNode';
import { RDFNode } from './RDFNode';
import { DHTRDFNetwork } from '../../services';
import { LDHTAction } from './LDHTAction';
import { Collection } from '@openhps/solid';
import { LDHTEntry } from './LDHTEntry';

@SerializableObject({
    rdf: {
        type: ldht.Node,
        serializer: (value: LocalRDFNode) => {
            const thing = RDFBuilder.namedNode(value.uri);
            if (value.network) {
                value.network.nodes.forEach((node: LocalRDFNode) => {
                    thing.add(
                        tree.relation,
                        RDFBuilder.blankNode()
                            .add(rdf.type, tree.GreaterThanOrEqualToRelation)
                            .add(tree.value, node.nodeID)
                            .add(tree.path, ldht.nodeID)
                            .add(tree.node, node.uri)
                            .build(),
                    );
                });
            }
            return thing.build();
        },
        deserializer: (value: Thing, instance) => {
            instance.uri = value.value as IriString;
            return instance;
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
            serializer: (value: IriString, node: LocalRDFNode) => {
                if (!value) {
                    return undefined;
                }
                // Create a TREE relation referencing the data
                return RDFBuilder.blankNode()
                    .add(rdf.type, tree.GreaterThanOrEqualToRelation)
                    .add(tree.value, node?.nodeID)
                    .add(tree.path, ldht.nodeID)
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
        },
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
            deserializer: (value: NamedNode) => {
                return value.value;
            },
        },
    })
    nodesUri: IriString;
    network: DHTRDFNetwork;

    get collectionUri(): IriString {
        return this.collection as IriString;
    }

    get nodesCollectionUri(): IriString {
        return (this.collection + 'nodes/') as IriString;
    }

    static fromURI(uri: IriString): LocalRDFNode {
        const node = new LocalRDFNode();
        node.uri = uri;
        return;
    }

    /**
     * Fetch neigbouring nodes and data
     * @returns
     */
    fetch(): Promise<this> {
        return new Promise((resolve, reject) => {
            const service = this.network.solidService;
            const session = service.session;
            if (!this.dataUri) {
                reject(new Error('Data URI is not set'));
                return;
            }
            service
                .getDatasetStore(session, this.dataUri)
                .then((store) => {
                    const collection: Collection = RDFSerializer.deserializeFromStore(null, store, Collection);
                    // Set data
                    this.collectionObject = collection;
                    if (!this.nodesUri) {
                        reject(new Error('Nodes URI is not set'));
                        return;
                    }
                    return service.getDatasetStore(session, this.nodesUri);
                })
                .then((store) => {
                    const collection: Collection = RDFSerializer.deserializeFromStore(null, store, Collection);
                    // Set nodes
                    collection.members.forEach((node: SerializableThing) => {
                        const id = node.id;
                        if (id) {
                            // Add node to network
                        }
                    });
                    resolve(this);
                })
                .catch(reject);
        });
    }

    store(
        key: number,
        value: string | string[],
        visitedNodes: Set<NodeID> = new Set(),
        maxHops: number = 0,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            super
                .store(key, value, visitedNodes, maxHops)
                .then(() => {
                    resolve();
                })
                .catch(reject);
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
                })
                .then((store) => {
                    const collection: Collection = createChangeLog(
                        RDFSerializer.deserializeFromStore(undefined, store) ??
                            new Collection(this.collection as IriString),
                    );
                    const data = Array.isArray(value) ? value : [value];
                    data.forEach((v) => {
                        const entry = new LDHTEntry();
                        entry.identifier = key;
                        entry.value = v as IriString;
                        // Only add if it doesn't exist
                        if (
                            !collection.members.find(
                                (m: LDHTEntry) => m.identifier === entry.identifier && m.value === entry.value,
                            )
                        ) {
                            collection.members.push(entry);
                        }
                    });
                    const changelog = RDFSerializer.serializeToChangeLog(collection);
                    if (changelog.additions.length === 0 && changelog.deletions.length === 0) {
                        resolve();
                        return;
                    }
                    store.addQuads(changelog.additions);
                    store.removeQuads(changelog.deletions);
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
            this.network.solidService.logger('debug', `Finding value for key ${key} locally in ${this.uri}`);
            super
                .findValue(key, visitedNodes, maxHops)
                .then((values) => {
                    resolve(values);
                })
                .catch(reject);
        });
    }

    ping(): Promise<void> {
        return new Promise((resolve) => {
            console.log('Pinging', this.nodeID);
            resolve();
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
                })
                .then(() => {
                    // Update node.ttl local node
                    return this.network.solidService.getDatasetStore(this.network.solidService.session, this.uri);
                })
                .then(async (store) => {
                    const uri = await this.network.findNodeById(nodeID);
                    const thing = RDFBuilder.namedNode(this.uri)
                        .add(
                            tree.relation,
                            RDFBuilder.blankNode()
                                .add(rdf.type, tree.GreaterThanOrEqualToRelation)
                                .add(tree.value, nodeID)
                                .add(tree.path, ldht.nodeID)
                                .add(tree.node, uri)
                                .build(),
                        )
                        .build();
                    const quads = RDFSerializer.serializeToQuads(thing);
                    store.addQuads(quads);
                    return this.network.solidService.saveDataset(this.network.solidService.session, this.uri, store);
                })
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
        return new Promise((resolve, reject) => {
            super
                .removeNode(nodeID)
                .then(() => {
                    // Save the node to the network
                    return this.saveNodes();
                })
                .then(() => {
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
            service
                .getDatasetStore(session, uri)
                .then((store) => {
                    nodesStore = store;
                    return RDFSerializer.deserializeFromStore(undefined, store);
                })
                .then((collection: Collection) => {
                    if (!collection) {
                        collection = new Collection(this.nodesCollectionUri);
                    }
                    collection = createChangeLog(collection);
                    this.network.nodes.forEach((node: LocalRDFNode) => {
                        if (node.nodeID === this.nodeID) {
                            return;
                        }
                        collection.members.push(new SerializableThing(node.uri));
                    });
                    const changelog = RDFSerializer.serializeToChangeLog(collection);
                    service.logger('debug', `Saving nodes to ${uri} with collection ${collection.id}`);
                    nodesStore.addQuads(changelog.additions);
                    nodesStore.removeQuads(changelog.deletions);
                    return service.saveDataset(session, uri, nodesStore);
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}
