import 'mocha';
import { expect } from 'chai';
import { DHTService } from '../../src';
import { DHTMemoryNetwork } from '../../src/services/DHTMemoryNetwork';

describe('DHTService', () => {
    let services: DHTService[] = [];
    before((done) => {
        const network = new DHTMemoryNetwork();
        services = [...Array.from({ length: 3 })].map(() => {
            return new DHTService(new DHTMemoryNetwork(undefined, network.nodes));
        });
        Promise.all(services.map((service) => {
            return service.emitAsync('build');
        })).then(() => {
            done();
        }).catch(done);
    });

    describe('constructor()', () => {
        it('should generate a random node id', () => {
            const node = services[0].node;
            expect(node.nodeID).to.be.a('number');
        });
    });

    describe('hash()', () => {
        it('should hash coordinates to a single key when given no accuracy', () => {
            const key1 = services[0].hash(50.82057996247597, 4.39222274282769);
            const key2 = services[0].hash(51.14415786460933, 3.5908935381010614);
            expect(key1.length).to.eql(1);
            expect(key2.length).to.eql(1);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });

        it('should hash coordinates to a single key when given an accurate accuracy', () => {
            const key1 = services[0].hash(50.82057996247597, 4.39222274282769, 5);
            const key2 = services[0].hash(51.14415786460933, 3.5908935381010614, 5);
            expect(key1.length).to.eql(1);
            expect(key2.length).to.eql(1);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });

        it('should hash coordinates to multiple keys when given an inaccurate accuracy', () => {
            const key1 = services[0].hash(50.82057996247597, 4.39222274282769, 10001);
            const key2 = services[0].hash(51.14415786460933, 3.5908935381010614, 20001);
            expect(key1.length).to.eql(2);
            expect(key2.length).to.eql(3);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });
    }); 

    describe('addPositioningSystem()', () => {

        before((done) => {
            Promise.all([
                services[0].addNode(services[1].node),
                services[0].addNode(services[2].node)
            ]).then(() => {
                done();
            }).catch(done);
        });

        it('should add a positioning system to the network', (done) => {
            services[0].addPositioningSystem('GPS', 50.82057996247597, 4.39222274282769, 5).then(() => {
                return services[1].findPositioningSystems(50.82057996247597, 4.39222274282769, 5);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                expect(systems[0]).to.eql('GPS');
                return services[2].addPositioningSystem('Test', 51.14415786460933, 3.5908935381010614, 1001);
            }).then(() => {
                return services[1].findPositioningSystems(51.14415786460933, 3.5908935381010614, 100);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                done();
            }).catch(done);
        });
    });

    describe('findPositioningSystems()', () => {
        before((done) => {
            Promise.all([
                services[0].addNode(services[1].node),
                services[0].addNode(services[2].node)
            ]).then(() => {
                return Promise.all([
                    services[0].addPositioningSystem('GPS2', 50.82057996247597, 4.39222274282769, 5),
                    services[2].addPositioningSystem('Test2', 51.14415786460933, 3.5908935381010614, 1001)
                ]);
            }).then(() => {
                done();
            }).catch(done);
        });

        it('should find positioning systems in the node where added', (done) => {
            services[0].findPositioningSystems(50.82057996247597, 4.39222274282769, 5).then((systems) => {
                expect(systems).to.have.lengthOf(2);
                expect(systems[0]).to.eql('GPS');
                expect(systems[1]).to.eql('GPS2');
                return services[2].findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(4);
                done();
            }).catch(done);
        });

        it('should find positioning systems in the network', (done) => {
            services[1].findPositioningSystems(50.82057996247597, 4.39222274282769, 5).then((systems) => {
                expect(systems).to.have.lengthOf(2);
                expect(systems[0]).to.eql('GPS');
                expect(systems[1]).to.eql('GPS2');
                return services[1].findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(4);
                done();
            }).catch(done);
        });
    });
});
