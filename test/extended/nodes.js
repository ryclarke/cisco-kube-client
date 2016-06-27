'use strict';
require('sugar');
require('should');
var bunyan = require('bunyan')
  , test = require('../test')
  , Client = require('../../index')
  , config = require ('../../config')
  , title = 'Cisco Kubernetes Client (nodes extended)'
  , test_namespace = 'kube-client-test'
  , client
  , patch
  , log
  , name;

describe(title, function () {
    // Initialize the client and test namespace
    before(function (done) {
        var self = this;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        patch = test.importFile('nodes-patchPods.json');

        log = bunyan.createLogger({ name: 'nodes (extended)' });

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
            log(error);
            done(error);
        });
    });
    
    // Test 'getPods' method
    it('should return the pod list', function (done) {
        client.nodes.getPods(name).then(function () {
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });

    // Test 'patchPods' method
    it('should patch the pod list', function (done) {
        if (!patch) return this.skip();
        client.nodes.patchPods(name, patch).then(function () {
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });

    // Test 'deletePods' method
    it('should delete the pod list', function (done) {
        if (!patch) return this.skip();
        client.nodes.deletePods(name).then(function () {
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });

    // Test 'evacuate' method
    it('should evacuate the node', function (done) {
        if (!patch) return this.skip();
        client.nodes.evacuate(name).then(function () {
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });

    // Test 'schedule' method
    it('should set the node as schedulable', function (done) {
        if (!patch) return this.skip();
        client.nodes.schedule(name).then(function () {
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });
});
