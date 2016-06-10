'use strict';
require('sugar');
var should = require('should')
  , test = require('../test')
  , Client = require('../../index')
  , config = require ('../../config')
  , title = 'Cisco Kubernetes Client (replicationControllers extended)'
  , test_namespace = 'kube-client-test'
  , replicas
  , client
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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        client = Client(Object.merge({
            namespace: null, timeout: this.timeout(), promise: false
        }, config, true, false));

        client.replicationControllers.get().then(function (rc) {
            name = rc.items[0].metadata.name;
            replicas = rc.items[0].spec.replicas;
            test_namespace = rc.items[0].metadata.namespace;
            done();
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });
    
    // Test 'scale' method with positive scale
    should.it('should scale the replicationController up', function (done) {
        client.replicationControllers.scale(name, 1, {namespace: test_namespace}).then(function (rc) {
            if (rc.spec.replicas == replicas + 1) {
                done();
            } else {
                throw new Error('spec.replicas should be incremented');
            }
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });

    // Test 'scale' method with negative scale
    should.it('should scale the replicationController down', function (done) {
        client.replicationControllers.scale(name, -1, {namespace: test_namespace}).then(function (rc) {
            if (rc.spec.replicas == replicas) {
                done();
            } else {
                throw new Error('spec.replicas should be decremented');
            }
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });
});