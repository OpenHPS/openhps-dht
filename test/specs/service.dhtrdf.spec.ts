import 'mocha';
import { expect } from 'chai';
import { LDHTAddNodeAction, LDHTPingAction, LDHTRemoveNodeAction, LDHTStoreValueAction, LocalRDFNode } from '../../src';
import { IriString, RDFSerializer } from '@openhps/rdf';

describe('RDFNode', () => {
    describe('LocalRDFNode', () => {
        it('should serialize', (done) => {
            const actionsUrl = 'https://solid.maximvdw.be/nodes/poso/actions/';
            const node = new LocalRDFNode(1, undefined);
            node.uri = 'https://solid.maximvdw.be/nodes/poso/node.ttl';
            node.collection = 'https://solid.maximvdw.be/nodes/poso/';
            node.actions = [
                new LDHTPingAction().setTarget(actionsUrl as IriString),
                new LDHTAddNodeAction().setTarget(actionsUrl as IriString),
                new LDHTRemoveNodeAction().setTarget(actionsUrl as IriString),
                new LDHTStoreValueAction().setTarget(actionsUrl as IriString),
            ];
            const store = RDFSerializer.serializeToStore(node);
            store.addQuads(RDFSerializer.serializeToQuads(node.collectionObject));
            RDFSerializer.stringify(store, {
                format: 'text/turtle'
            }).then((data) => {
                console.log(data);
                done();
            }).catch(done);
        });
    });
});
