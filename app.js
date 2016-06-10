'use strict';
require('sugar');

// Import the client library
var Client = require('cisco-kube-client');

// Permit usage of self-signed SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialize the client with options specified in the file `config.json`
// Options can also be defined as properties of a local object
var options = require('./config');
var client = new Client(options);

// Uncomment to print list of available endpoints
//console.log(client);

//////////////////////////////////////////////
//                                          //
//   Try out the initialized client below   //
//                                          //
//////////////////////////////////////////////

client.pods.get().then(function (rc) {
    console.log(rc);
});

