import 'mocha';
import { expect } from 'chai';
import { DHTRDFNetwork, DHTService } from '../../src';
import { SolidClientService } from '@openhps/solid';
import { generate, isPodAvailable } from '../utils/secret';
import { Model, ModelBuilder } from '@openhps/core';

describe('DHTRDFService', () => {
    let services: DHTService[] = [];
    let solidServices: SolidClientService[] = [];
    let models: Model[] = [];

    before(async function () {
        // Provisioning three Solid pods -- account login, client credentials, then
        // the container/ACL setup each DHT node does on build -- runs well past the
        // 20s default from .mocharc.json. Measured at ~25-30s locally against the
        // docker-compose servers, and CI runners are not faster.
        this.timeout(120000);
        const available = await Promise.all([
            isPodAvailable('http://localhost:3000'),
            isPodAvailable('http://localhost:3001'),
            isPodAvailable('http://localhost:3002'),
        ]);
        if (available.includes(false)) {
            // The docker-compose Solid pods are not running; skip rather than fail.
            this.skip();
        }
        const secrets = await Promise.all([
            generate('http://localhost:3000', 'test1', 'test1@test.com', 'test123'),
            generate('http://localhost:3001', 'test2', 'test2@test.com', 'test123'),
            generate('http://localhost:3002', 'test3', 'test3@test.com', 'test123'),
        ]);
        solidServices = secrets.map((secret, i) => {
            const oidcIssuer = `http://localhost:${3000 + i}`;
            return new SolidClientService({
                clientId: secret.id,
                clientSecret: secret.secret,
                clientName: 'OpenHPS',
                defaultOidcIssuer: oidcIssuer,
                autoLogin: true,
            });
        });
        services = solidServices.map(() => {
            return new DHTService(new DHTRDFNetwork('http://purl.org/poso/collection/'));
        });
        models = await Promise.all(
            solidServices.map((service, i) => {
                return ModelBuilder.create()
                    .addService(service) // Solid service
                    .addService(services[i]) // DHT service
                    .withLogger(console.log)
                    .build();
            }),
        );
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
            expect(key1[0]).to.eql(6259613);
            expect(key2[0]).to.eql(6275608);
        });

        it('should hash coordinates to a single key when given an accurate accuracy', () => {
            const key1 = services[0].hash(50.82057996247597, 4.39222274282769, 5);
            const key2 = services[0].hash(51.14415786460933, 3.5908935381010614, 5);
            expect(key1.length).to.eql(1);
            expect(key2.length).to.eql(1);
            expect(key1[0]).to.eql(6259613);
            expect(key2[0]).to.eql(6275608);
        });

        it('should hash coordinates to multiple keys when given an inaccurate accuracy', () => {
            // 10001 m covers 2 partitions -> a 3x3 box of keys; 20001 m covers 3
            // partitions -> a 5x5 box of keys. The origin partition is always first.
            const key1 = services[0].hash(50.82057996247597, 4.39222274282769, 10001);
            const key2 = services[0].hash(51.14415786460933, 3.5908935381010614, 20001);
            expect(key1.length).to.eql(9);
            expect(key2.length).to.eql(25);
            expect(key1[0]).to.eql(6259613);
            expect(key2[0]).to.eql(6275608);
        });
    });

    describe('addPositioningSystem()', () => {
        before(function (done) {
            this.timeout(30000);
            Promise.all([services[0].addNode(services[1].node.clone()), services[0].addNode(services[2].node.clone())])
                .then(() => {
                    done();
                })
                .catch(done);
        });

        it('should add a positioning system to the network', (done) => {
            services[0]
                .addPositioningSystem('GPS', 50.82057996247597, 4.39222274282769, 5)
                .then(() => {
                    return services[1].findPositioningSystems(50.82057996247597, 4.39222274282769, 5);
                })
                .then((systems) => {
                    expect(systems).to.have.lengthOf(1);
                    expect(systems[0]).to.eql('GPS');
                    return services[2].addPositioningSystem('Test', 51.14415786460933, 3.5908935381010614, 1001);
                })
                .then(() => {
                    return services[1].findPositioningSystems(51.14415786460933, 3.5908935381010614, 100);
                })
                .then((systems) => {
                    expect(systems).to.have.lengthOf(1);
                    done();
                })
                .catch(done);
        });
    });

    describe('findPositioningSystems()', () => {
        before((done) => {
            Promise.all([services[0].addNode(services[1].node.clone()), services[0].addNode(services[2].node.clone())])
                .then(() => {
                    return Promise.all([
                        services[0].addPositioningSystem('GPS2', 50.82057996247597, 4.39222274282769, 5),
                        services[2].addPositioningSystem('Test2', 51.14415786460933, 3.5908935381010614, 1001),
                    ]);
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });

        it('should find positioning systems in the node where added', (done) => {
            services[0]
                .findPositioningSystems(50.82057996247597, 4.39222274282769, 5)
                .then((systems) => {
                    expect(systems).to.have.lengthOf(2);
                    expect(systems[0]).to.eql('GPS');
                    expect(systems[1]).to.eql('GPS2');
                    return services[2].findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
                })
                .then((systems) => {
                    expect(systems).to.have.lengthOf(4);
                    done();
                })
                .catch(done);
        });

        it('should find positioning systems in the network', (done) => {
            services[1]
                .findPositioningSystems(50.82057996247597, 4.39222274282769, 5)
                .then((systems) => {
                    expect(systems).to.have.lengthOf(2);
                    expect(systems[0]).to.eql('GPS');
                    expect(systems[1]).to.eql('GPS2');
                    return services[1].findPositioningSystems(50.82057996247597, 4.39222274282769, 2000000);
                })
                .then((systems) => {
                    expect(systems).to.have.lengthOf(4);
                    done();
                })
                .catch(done);
        });
    });
});
