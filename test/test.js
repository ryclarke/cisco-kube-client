require('sugar');
var should = require('should')
  , path = require('path');

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
module.exports = function testEndpoint(resource, client) {
    describe(resource.camelize(true), function() {
        this.slow(2000);
        var list
          , name
          , object
          , patch
          , podPatch
          , rc;

        // Import json data for endpoint
        before(function () {
            object = importFile(resource + '.json');
            patch = importFile(resource + '-patch.json');
            if (resource === 'nodes') {
                podPatch = importFile(resource + '-podPatch.json');
            } else if (resource === 'replicationControllers') {
                return client.replicationControllers.get({namespace: null}).then(function (rcs) {
                    if (rcs.items.length > 0) {
                        rc = rcs.items[0];
                    }
                });
            }
        });

        // Artificial delay to allow for server tasks between requests
        beforeEach(function (done) { setTimeout(done, 500); });

        if (!(client[resource].options.list === false)) {
            if (client[resource].get) {
                // Test `get` method without a query
                it('list get', function () {
                    return client[resource].get().then(function (resource) {
                        if (resource.kind === 'Status') {
                            return;
                        }
                        should(resource).have.property('items');
                        list = resource.items;
                    });
                });
            }

            if (client[resource].watch) {
                // Test `watch` method without a query
                it('list watch', function (done) {
                    client[resource].watch().then(function (emitter) {
                        emitter.on('response', function (response) {
                            should(response).have.property('statusCode', 200);
                            done();
                        }).on('error', function (error) {
                            done(error);
                        }).start(0);
                    }).catch(function (error) {
                        done(error);
                    });
                });
            }
        }

        if (client[resource].create) {
            // Test `create` method
            it('item create', function () {
                if (!object) return this.skip();
                return client[resource].create(object).then(function (resource) {
                    should(resource).have.property('metadata');
                    should(resource.metadata).have.property('name');
                    name = resource.metadata.name;
                });
            });
        }

        if (client[resource].get) {
            // Test `get` method with a query
            it('item get', function () {
                if (name) {
                    return client[resource].get(name).then(function (resource) {
                        should(resource).have.property('metadata');
                        object = resource;
                    });
                } else if (list && list.length > 0) {
                    return client[resource].get(list[0].metadata.name).then(function (resource) {
                        should(resource).have.property('metadata');
                    }).catch(function (err) {
                        throw err;
                    });
                } else {
                    return this.skip();
                }
            });
        }

        if (client[resource].patch) {
            // Test `patch` method
            it('item patch', function () {
                if (!name || !patch) return this.skip();
                return client[resource].patch(name, patch).then(function (resource) {
                    should(resource.metadata.annotations).have.property('test', patch.metadata.annotations.test);
                    if (resource.spec) {
                        for (var property in patch.spec) {
                            if (patch.spec.hasOwnProperty(property)) {
                                should(resource.spec).have.property(property, patch.spec[property]);
                            }
                        }
                    }
                });
            });
        }

        if (client[resource].update) {
            // Test `update` method
            it('item update', function () {
                if (!name || !object) return this.skip();
                return client[resource].get(name).then(function (result) {
                    object.metadata.resourceVersion = result.metadata.resourceVersion;
                    return client[resource].update(name, object).then(function (resource) {
                        should(resource.metadata.annotations).have.property('test', object.metadata.annotations.test);
                        if (resource.spec) {
                            for (var property in object.spec) {
                                if (object.spec.hasOwnProperty(property)) {
                                    should(resource.spec).have.property(property, object.spec[property]);
                                }
                            }
                        }
                    });
                });
            });
        }

        // Test extended methods for `replicationControllers`
        if (resource === 'replicationControllers') {
            // Test `scale` method with positive scale
            it('item scale up', function () {
                if (!name && (!list || list.length === 0)) return this.skip();
                return client.replicationControllers.scale(name || list[0].metadata.name, 1).then(function (response) {
                    should(response.spec.replicas).equal((object || list[0]).spec.replicas + 1);
                });
            });

            // Test `scale` method with negative scale
            it('item scale down', function () {
                if (!name && (!list || list.length === 0)) return this.skip();
                return client.replicationControllers.scale(name || list[0].metadata.name, -1).then(function (response) {
                    should(response.spec.replicas).equal(object.spec.replicas);
                });
            });
        }

        if (client[resource].delete) {
            // Test `delete` method
            it('item delete', function () {
                if (!name || !client[resource].delete) return this.skip();
                return client[resource].delete(name).then(function (r) {
                    should(r).have.property('code', 200);
                });
            });
        }

        // Test extended methods for `nodes`
        if (resource === 'nodes') {
            // Test 'getPods' method
            it('pods get', function () {
                if (!list || list.length === 0) return this.skip();
                return client.nodes.getPods(list[0].metadata.name).then(function (resource) {
                    return resource;
                });
            });

            // Test 'patchPods' method
            it('pods patch', function () {
                if (!podPatch || !list || list.length === 0) return this.skip();
                return client.nodes.patchPods(list[0].metadata.name, patch).then(function (resource) {
                    return resource;
                });
            });

            // Test 'deletePods' method
            it('pods delete', function () {
                return this.skip();
                if (!list || list.length === 0) return this.skip();
                return client.nodes.deletePods(list[0].metadata.name).then(function (resource) {
                    return resource;
                });
            });

            // Test 'evacuate' method
            it('item evacuate', function () {
                return this.skip();
                if (!list || list.length === 0) return this.skip();
                return client.nodes.evacuate(list[0].metadata.name).then(function (resource) {
                    return resource;
                });
            });

            // Test 'schedule' method
            it('item schedule', function () {
                return this.skip();
                if (!list || list.length === 0) return this.skip();
                return client.nodes.schedule(list[0].metadata.name).then(function (resource) {
                    return resource;
                });
            });
        }
    });
};
