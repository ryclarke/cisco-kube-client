'use strict';
require('sugar');
var should = require('should')
  , Client = require('../lib/client.min')
  , config = require ('../config')
  , title = 'Cisco Kubernetes Client (miscellaneous)';

var debug = function(){};

should.describe(title, function () {
    var client;

    // Initialize the client and test namespace
    should.before(function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        client = Client(Object.merge({
            namespace: 'kube-client-test', timeout: this.timeout(), promise: false
        }, config, true, false));
    });
    
    // Initialize the client as a Promise
    should.it('should return a Promise of the client', function (done) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
        Client(Object.merge({
            namespace: 'kube-client-test', timeout: this.timeout(), usePromise: true
        }, config, true, false)).then(function (client) {
            client.namespaces.get().then(function () {
                done();
            });
        }).catch(function (error) {
            done(error); debug(JSON.stringify(error, null, 4));
        });
    });
    
    // Use a method with a Node.js callback
    should.it('should use a Node.js callback', function (done) {
        client.namespaces.get(function (error) {
            if (error) {
                done(error);
                debug(JSON.stringify(error, null, 4));
            } else done();
        });
    });
});
