import 'mocha';
import { expect } from 'chai';
import { DHTRDFNetwork, DHTService } from '../../src';
import { DHTMemoryNetwork } from '../../src/services/DHTMemoryNetwork';

describe('DHTRDFService', () => {
    describe('constructor()', () => {
        let service: DHTService;

        before((done) => {
            service = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service.emitAsync('build').then(() => {
                done();
            }).catch(done);
        });

        it('should generate a random node id', () => {
            const node = service.node;
            expect(node.nodeID).to.be.a('number');
        });
    });

    describe('hash()', () => {
        let service: DHTService;

        before((done) => {
            service = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service.emitAsync('build').then(() => {
                done();
            }).catch(done);
        });

        it('should hash coordinates to a single key when given no accuracy', () => {
            const key1 = service.hash(50.82057996247597, 4.39222274282769);
            const key2 = service.hash(51.14415786460933, 3.5908935381010614);
            expect(key1.length).to.eql(1);
            expect(key2.length).to.eql(1);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });

        it('should hash coordinates to a single key when given an accurate accuracy', () => {
            const key1 = service.hash(50.82057996247597, 4.39222274282769, 5);
            const key2 = service.hash(51.14415786460933, 3.5908935381010614, 5);
            expect(key1.length).to.eql(1);
            expect(key2.length).to.eql(1);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });

        it('should hash coordinates to multiple keys when given an inaccurate accuracy', () => {
            const key1 = service.hash(50.82057996247597, 4.39222274282769, 10001);
            const key2 = service.hash(51.14415786460933, 3.5908935381010614, 20001);
            expect(key1.length).to.eql(2);
            expect(key2.length).to.eql(3);
            expect(key1[0]).to.eql(17532);
            expect(key2[0]).to.eql(17647);
        });
    }); 

    describe('addPositioningSystem()', () => {
        let service1: DHTService;
        let service2: DHTService;
        let service3: DHTService;

        before((done) => {
            service1 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service2 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service3 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));

            Promise.all([
                service1.emitAsync('build'),
                service2.emitAsync('build'),
                service3.emitAsync('build')
            ]).then(() => {
                return Promise.all([
                    service1.addNode(service2.node),
                    service1.addNode(service3.node)
                ]);
            }).then(() => {
                done();
            }).catch(done);
        });

        it('should add a positioning system to the network', (done) => {
            service1.addPositioningSystem('GPS', 50.82057996247597, 4.39222274282769, 5).then(() => {
                return service2.findPositioningSystems(50.82057996247597, 4.39222274282769, 5);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                expect(systems[0]).to.eql('GPS');
                return service3.addPositioningSystem('Test', 51.14415786460933, 3.5908935381010614, 1001);
            }).then(() => {
                return service2.findPositioningSystems(51.14415786460933, 3.5908935381010614, 100);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                done();
            }).catch(done);
        });
    });

    describe('findPositioningSystems()', () => {
        let service1: DHTService;
        let service2: DHTService;
        let service3: DHTService;

        before((done) => {
            service1 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service2 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));
            service3 = new DHTService(new DHTRDFNetwork('http://poso.purl.org/'));

            Promise.all([
                service1.emitAsync('build'),
                service2.emitAsync('build'),
                service3.emitAsync('build')
            ]).then(() => {
                return Promise.all([
                    service1.addNode(service2.node),
                    service1.addNode(service3.node)
                ]);
            }).then(() => {
                return Promise.all([
                    service1.addPositioningSystem('GPS', 50.82057996247597, 4.39222274282769, 5),
                    service3.addPositioningSystem('Test', 51.14415786460933, 3.5908935381010614, 1001)
                ]);
            }).then(() => {
                done();
            }).catch(done);
        });

        it('should find positioning systems in the node where added', (done) => {
            service1.findPositioningSystems(50.82057996247597, 4.39222274282769, 5).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                expect(systems[0]).to.eql('GPS');
                return service3.findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(2);
                done();
            }).catch(done);
        });

        it('should find positioning systems in the network', (done) => {
            service2.findPositioningSystems(50.82057996247597, 4.39222274282769, 5).then((systems) => {
                expect(systems).to.have.lengthOf(1);
                expect(systems[0]).to.eql('GPS');
                return service2.findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
            }).then((systems) => {
                expect(systems).to.have.lengthOf(2);
                done();
            }).catch(done);
        });
    });
});
