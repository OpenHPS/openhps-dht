import 'mocha';
import { expect } from 'chai';
import { LDHTAddNodeAction, LDHTEntry, LDHTPingAction, LDHTRemoveNodeAction, LDHTStoreValueAction, LocalRDFNode } from '../../src';
import { DataFactory, IriString, RDFSerializer } from '@openhps/rdf';

describe('RDFNode', () => {
    describe('LocalRDFNode', () => {
        it('should serialize an entry', (done) => {
            const entry = new LDHTEntry();
            entry.identifier = 1;
            entry.value = 'test' as any;
            const store = RDFSerializer.serializeToStore(entry);
            RDFSerializer.stringify(store, {
                format: 'text/turtle'
            }).then((data) => {
                // console.log(data);
                done();
            }).catch(done);
        });

        it('should serialize', (done) => {
            const actionsUrl = 'https://solid.maximvdw.be/nodes/poso/actions/';
            const node = new LocalRDFNode(1, undefined);
            node.uri = 'https://solid.maximvdw.be/nodes/poso/node.ttl';
            node.collection = 'https://solid.maximvdw.be/nodes/poso/';
            node.dataUri = 'https://solid.maximvdw.be/nodes/poso/data.ttl';
            node.actions = [
                new LDHTPingAction().setTarget(actionsUrl as IriString),
                new LDHTAddNodeAction().setTarget(actionsUrl as IriString),
                new LDHTRemoveNodeAction().setTarget(actionsUrl as IriString),
                new LDHTStoreValueAction().setTarget(actionsUrl as IriString),
            ];
            // Add dummy data
            node.dataStore.set(123, ['test', 'test123']);
            const store = RDFSerializer.serializeToStore(node);
            store.addQuads(RDFSerializer.serializeToQuads(node.collectionObject));
            RDFSerializer.stringify(store, {
                format: 'text/turtle'
            }).then((data) => {
                // Deserialize
                console.log(data);
                return RDFSerializer.deserializeFromString(node.uri, data);
            }).then((deserializedNode: LocalRDFNode) => {
                done();
            }).catch(done);
        });

        it('should deserialize from string', (done) => {
            const data = `
                <http://localhost:3000/test1/nodes/poso/node.ttl> a <http://purl.org/ldht/Node>;
        <http://purl.org/ldht/nodeID> "-6032"^^<http://www.w3.org/2001/XMLSchema#double>;
        <http://schema.org/potentialAction> _:n3-0.
    _:n3-0 a <http://purl.org/ldht/PingAction>;
        <http://schema.org/target> <http://localhost:3000/test1/nodes/poso/actions/>.
    <http://localhost:3000/test1/nodes/poso/node.ttl> <http://schema.org/potentialAction> _:n3-1.
    _:n3-1 a <http://purl.org/ldht/AddNodeAction>;
        <http://schema.org/target> <http://localhost:3000/test1/nodes/poso/actions/>.
    <http://localhost:3000/test1/nodes/poso/node.ttl> <http://schema.org/potentialAction> _:n3-2.
    _:n3-2 a <http://purl.org/ldht/RemoveNodeAction>;
        <http://schema.org/target> <http://localhost:3000/test1/nodes/poso/actions/>.
    <http://localhost:3000/test1/nodes/poso/node.ttl> <http://schema.org/potentialAction> _:n3-3.
    _:n3-3 a <http://purl.org/ldht/StoreValueAction>;
        <http://schema.org/target> <http://localhost:3000/test1/nodes/poso/actions/>.
    <http://localhost:3000/test1/nodes/poso/node.ttl> <https://w3id.org/tree#relation> _:n3-4.`
            const deserialised: LocalRDFNode = RDFSerializer.deserializeFromString('http://localhost:3000/test1/nodes/poso/node.ttl', data);
            expect(deserialised).to.be.an.instanceOf(LocalRDFNode);
            expect(deserialised.actions[0]).to.be.instanceOf(LDHTPingAction);
            done();
        });

        it('should deserialize from url', (done) => {
            const actionsUrl = 'http://localhost:3000/test1/nodes/poso/actions/';
            const node = new LocalRDFNode(1, undefined);
            node.uri = 'http://localhost:3000/test1/nodes/poso/node.ttl';
            node.collection = 'http://localhost:3000/test1/nodes/poso/';
            node.actions = [
                new LDHTPingAction().setTarget(actionsUrl as IriString),
                new LDHTAddNodeAction().setTarget(actionsUrl as IriString),
                new LDHTRemoveNodeAction().setTarget(actionsUrl as IriString),
                new LDHTStoreValueAction().setTarget(actionsUrl as IriString),
            ];
            
            fetch(node.uri, {
                method: 'GET',
                headers: {
                    'Accept': 'text/turtle'
                }
            }).then((response) => {
                return response.text();
            }).then((data) => {
                return RDFSerializer.deserializeFromString(node.uri, data);
            }).then((deserialised: LocalRDFNode) => {
                done();
            }).catch(done);
        });
    });
});
