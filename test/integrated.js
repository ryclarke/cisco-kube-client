var should = require('should')
  , Client = require('../index')
  , testEndpoint = require('./test')
  , configFile = './config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var config;
try {
    config = Object.merge({
        namespace: 'kube-client-test'
        , version: 'v1'
        , oshift: true
        , extensions: true
    }, require(configFile), true);
} catch (error) {
    if (error.message.startsWith('Cannot find module')) {
        throw new Error('Define `host` and `auth` options in the file ' + configFile);
    } else {
        throw error;
    }
}

describe('Cisco Kubernetes Client', function () {
    var client = Client(config);

    // If `TEST` environment variable is set, only test the given endpoint
    if (client.hasOwnProperty(process.env.TEST)) {
        testEndpoint(process.env.TEST, client);
    } else {
        // Test assorted client capabilities
        describe('Miscellaneous', function () {
            // Initialize the client and test namespace
            before(function () {
            });

            // Initialize the client as a Promise
            it('should return a Promise of the client', function () {
                return Client(Object.merge({usePromise: true}, config, true, false));
            });
            // Use a method with a Node.js callback
            it('should use a Node.js callback', function (done) {
                client.pods.get(function (error, resource) {
                    if (error) {
                        done(error);
                    } else {
                        should(resource).have.property('items');
                        done();
                    }
                });
            });
        });

        // Test all client endpoints
        for (var endpoint in client) {
            if (client.hasOwnProperty(endpoint) && !endpoint.startsWith('proxy/')) {
                testEndpoint(endpoint, client);
            }
        }
    }
});
