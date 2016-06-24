'use strict';
require('sugar');
require('should');
var bunyan = require('bunyan')
  , test = require('../test')
  , Client = require('../../index')
  , config = require ('../../config')
  , title = 'Cisco Kubernetes Client (replicationControllers extended)'
  , test_namespace = 'kube-client-test'
  , replicas
  , client
  , log
  , name;

describe(title, function () {
    // Initialize the client and test namespace
    before(function (done) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
        log = bunyan.createLogger({ name: 'replication controllers (extended)' });
        
        client = Client(Object.merge({
            namespace: null, timeout: this.timeout(), promise: false
        }, config, true, false));

        client.replicationControllers.get().then(function (rc) {
            name = rc.items[0].metadata.name;
            replicas = rc.items[0].spec.replicas;
            test_namespace = rc.items[0].metadata.namespace;
            done();
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });
    
    // Test 'scale' method with positive scale
    it('should scale the replicationController up', function (done) {
        client.replicationControllers.scale(name, 1, {namespace: test_namespace}).then(function (rc) {
            if (rc.spec.replicas == replicas + 1) {
                done();
            } else {
                throw new Error('spec.replicas should be incremented');
            }
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });

    // Test 'scale' method with negative scale
    it('should scale the replicationController down', function (done) {
        client.replicationControllers.scale(name, -1, {namespace: test_namespace}).then(function (rc) {
            if (rc.spec.replicas == replicas) {
                done();
            } else {
                throw new Error('spec.replicas should be decremented');
            }
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });
});