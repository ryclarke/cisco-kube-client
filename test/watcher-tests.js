const WatchEmitter = require('../lib/watch-emitter');
const http = require('http');
const net = require('net');
const EventEmitter = require('events');

function createStubKubernetesWatchEndpoint (serverControl) {
    return http.createServer((req, res) => {
        res.writeHead(200, {});
        serverControl.on('change', evt => {
            res.write(JSON.stringify({
                type: evt.type,
                object: {
                    metadata: {
                        resourceVersion: 'v1'
                    }
                }
            }));
        });
        serverControl.on('end', () => {
            res.socket.end();
        });
    });
}

describe('Watcher', () => {
    it('Reconnects when connection to the api is lost', (done) => {
        var serverControl = new EventEmitter();
        var api = createStubKubernetesWatchEndpoint(serverControl);
        api.listen(3000);

        const watcher = new WatchEmitter(
            {},
            {
                uri: 'http://localhost:3000',
                qs: {
                    resourceVersion: 'v1'
                }
            },
            {
                child: () => ({
                    info: console.log,
                    debug: console.log,
                    error: console.log,
                }),
            }
        );
        const createEvents = [];
        watcher.on('create', event => {
            createEvents.push(event);
        });
        watcher.on('error', done);
        api.on('request', () => {
            serverControl.emit('change', {type:'ADDED'});
            if (createEvents.length === 2) {
                api.close();
                // we got 2 create events which means we recovered from the
                // closed socket, we can now successfuly end the test.
                return done();
            }
            // after the first change event, focibly kill the connection.
            serverControl.emit('end');
        });
        watcher.start();
    });
});
