'use strict';
require('sugar');
require('should');
var path = require('path')
  , bunyan = require('bunyan')
  , Client = require('../index')
  , config = require ('../config')
  , title = 'Cisco Kubernetes Client'
  , test_namespace = 'cisco-kube-test';

/**
 * @static
 * @param {string|object} data
 * @returns {?module.exports|object}
 */
function importFile(data) {
    if (typeof data === 'string') {
        try {
            return require(path.join(__dirname, 'json', data));
        } catch (ignore) {
            return null;
        }
    } else {
        return data;
    }
}

/**
 * @static
 */
function TestEndpoint(resource, config) {
    describe(title + ' (' + resource + ')', function() {
        var log
          , client
          , object
          , patch
          , name;

        // Initialize the client and test namespace
        before(function (done) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

            object = importFile(resource + '.json');
            patch = importFile(resource + '-patch.json');
            
            log = bunyan.createLogger({ name: resource });

            client = Client(Object.merge({
                namespace: test_namespace, timeout: this.timeout(), promise: false
            }, config, true, false));

            client.namespaces.get(test_namespace).catch(function (error) {
                if (error.statusCode == 404) return client.namespaces.create({metadata: {name: test_namespace}});
                throw error;
            }).then(function () {
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Artificial delay to allow for server tasks between requests
        beforeEach(function (done) { setTimeout(done, 500); });

        it('should return the resource list', function (done) {
            if (!client[resource].get) return this.skip();
            client[resource].get().then(function () {
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Test `watch` method
        it('should watch the resource list', function (done) {
            if (!client[resource].watch) return this.skip();
            client[resource].watch().then(function (emitter) {
                emitter.on('response', function () {
                    done();
                }).on('error', function (error) {
                    log.error(error);
                    done(error);
                }).start(0);
            }).catch(function (error) {
                log.error(error);
                done(error);
             });
        });

        // Test `create` method
        it('should create the resource', function (done) {
            if (!client[resource].create) return this.skip();
            if (!object) return this.skip();
            client[resource].create(object).then(function (result) {
                name = result.metadata.name;
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Test `get` method with a query
        it('should return the resource', function (done) {
            if (!client[resource].get) return this.skip();
            if (!name) return this.skip();
            client[resource].get(name).then(function (result) {
                object = result;
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Test `patch` method
        it('should patch the resource', function (done) {
            if (!client[resource].patch) return this.skip();
            if (!name) return this.skip();
            if (!patch) return this.skip();
            client[resource].patch(name, patch).then(function () {
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Test `update` method
        it('should update the resource', function (done) {
            if (!client[resource].update) return this.skip();
            if (!name) return this.skip();
            if (!object) return this.skip();
            client[resource].get(name).then(function (result) {
                object.metadata.resourceVersion = result.metadata.resourceVersion;
                return client[resource].update(name, object).then(function () {
                    done();
                });
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });

        // Test `delete` method
        it('should delete the resource', function (done) {
            if (!client[resource].delete) return this.skip();
            if (!name) return this.skip();
            client[resource].delete(name).then(function () {
                done();
            }).catch(function (error) {
                log.error(error);
                done(error);
            });
        });
    });
}

/**
 * @private
 * @module test
 */
module.exports = TestEndpoint;
module.exports.importFile = importFile;
