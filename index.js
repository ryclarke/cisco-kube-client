module.exports = require('./lib/client');
/**
 * @module * index
 * @description The main entry point for [cisco-kube-client]{@link https://npmjs.org/packages/cisco-kube-client}
 * 
 * The [client]{@link module:client} module is exported to the end-user.
 *
 * @see {module:client}
 * @example
 * // Import the client module
 * var Client = require('cisco-kube-client')
 *
 * // Define client configuration options
 * var options = {
 *     host: 'http://localhost:8080'
 *   , version: 'v1'
 *   , auth: {
 *       user: 'JohnDoe'
 *     , pass: 'password123'
 *   }
 * };
 *
 * // Initialize client
 * var client = Client(options);
 *
 * // Use client to list Kubernetes namespaces
 * client.namespaces.get().then(function (ns) {
 *     console.log(ns);
 * }).catch(function (err) {
 *     console.log(err);
 * });
 */
