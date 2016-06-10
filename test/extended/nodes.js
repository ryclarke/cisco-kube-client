'use strict';
require('sugar');
var should = require('should')
  , test = require('../test')
  , Client = require('../../index')
  , config = require ('../../config')
  , title = 'Cisco Kubernetes Client (nodes extended)'
  , test_namespace = 'kube-client-test'
  , client
  , patch
  , name;

var debug;
try {
    debug = require('debug')('test');
} catch (error) {
    debug = function(){};
}

should.describe(title, function () {
    // Initialize the client and test namespace
    should.before(function (done) {
        var self = this;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        patch = test.importFile('nodes-patchPods.json');

        client = Client(Object.merge({
            namespace: test_namespace, timeout: this.timeout(), promise: false
        }, config, true, false));

        client.nodes.get().then(function (nodes) {
            if (nodes.items && nodes.items.length > 0) {
                name = nodes.items[0].metadata.name;
                done();
            } else {
                return self.skip();
            }
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });
    
    // Test 'getPods' method
    should.it('should return the pod list', function (done) {
        client.nodes.getPods(name).then(function () {
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });

    // Test 'patchPods' method
    should.it('should patch the pod list', function (done) {
        if (!patch) return this.skip();
        client.nodes.patchPods(name, patch).then(function () {
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });

    // Test 'deletePods' method
    should.it('should delete the pod list', function (done) {
        if (!patch) return this.skip();
        client.nodes.deletePods(name).then(function () {
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });

    // Test 'evacuate' method
    should.it('should evacuate the node', function (done) {
        if (!patch) return this.skip();
        client.nodes.evacuate(name).then(function () {
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });

    // Test 'schedule' method
    should.it('should set the node as schedulable', function (done) {
        if (!patch) return this.skip();
        client.nodes.schedule(name).then(function () {
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });
});
