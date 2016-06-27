'use strict';
require('sugar');
require('should');
var bunyan = require('bunyan')
  , Client = require('../lib/client.min')
  , config = require ('../config')
  , title = 'Cisco Kubernetes Client (miscellaneous)'
  , log;

describe(title, function () {
    var client;

    // Initialize the client and test namespace
    before(function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        log = bunyan.createLogger({ name: 'util' });

        client = Client(Object.merge({
            namespace: 'kube-client-test', timeout: this.timeout(), promise: false
        }, config, true, false));
    });
    
    // Initialize the client as a Promise
    it('should return a Promise of the client', function (done) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
        Client(Object.merge({
            namespace: 'kube-client-test', timeout: this.timeout(), usePromise: true
        }, config, true, false)).then(function (client) {
            client.namespaces.get().then(function () {
                done();
            });
        }).catch(function (error) {
            log(error);
            done(error);
        });
    });
    
    // Use a method with a Node.js callback
    it('should use a Node.js callback', function (done) {
        client.namespaces.get(function (error) {
            if (error) {
                log(error);
                done(error);
            } else done();
        });
    });
});
