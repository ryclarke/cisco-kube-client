'use strict';
require('sugar');
var url = require('url')
  , Promise = require('bluebird')
  , request = require('request')
  , errors  = require('./errors');

/**
 * @name call
 * @public
 * @function
 * @memberof module:auth
 * @description Authenticate and save the new oAuth token
 *
 * Authenticate with the Kubernetes deployment's oAuth server. The `token` property of the given
 * [ClientConfig]{@link module:client~ClientConfig} is updated to match the new token.
 *
 * @param {module:client~ClientConfig} config - Client configuration to update
 * @param {boolean} [flush=false] - Delete the previous token if it already exists
 * @param {function} [next] - Node.js callback (replaces Promise output)
 *
 * @throws {module:errors.TokenParseError}
 *
 * @returns {?Promise.<module:client~ClientConfig>} `ClientConfig` with updated `token` property
 */
/**
 * @module auth
 * @description Authentication Management Module
 */
module.exports = function Authenticate(config, flush, next) {
    if (flush && config.token !== null) {
        config.token = null;
    }
    if (config.auth === null) {
        return Promise.resolve(config).nodeify(next);
    } else {
        return getNewToken(config).nodeify(next);
    }
};

/**
 * @private
 * @description Request a new token if one is not already defined
 *
 * @param {module:client~ClientConfig} config - Client configuration to update
 * @param {string} config.token - Replace this value with the new oAuth token
 *
 * @throws {module:errors.TokenParseError}
 * 
 * @returns {Promise.<module:client~ClientConfig>} `ClientConfig` with updated `token` property
 */
function getNewToken(config) {
    // Skip authentication if the client already has a token
    if (config.token) {
        return Promise.resolve(config);
    }
    // Refuse to authenticate over HTTP unless the override is set
    if (!config.authOptions.allowUnsafe && !config.host.match(/^https:\/\//)) {
        return errors.throw(config.log, 'fatal', new errors.ClientError('refusing to authenticate over http')
            , null, 'set authOptions.allowUnsafe to suppress', Promise.reject);
    }
    var options = Object.merge({
        url: config.host + '/oauth/authorize'
        , followRedirect: false
        , auth: config.auth
        , headers: { 'X-CSRF-Token': Math.random().toString() }
        , qs: {
            response_type: 'token'
            , client_id: 'openshift-challenging-client'
        }
    }, config.authOptions, true);
    // Clear user credentials after first authentication
    if (config.authOptions.preserveAuth === false) {
        config.auth = null;
    }
    return requestAsync(options).then(function (response) {
        var error = errors(null, response);
        if (error) {
            /** @name error.statusCode */
            if (error.statusCode == 401) {
                error.message = 'invalid user credentials';
            }
            throw error;
        }
        config.token = parseToken(response);
        return config;
    }).catch(function (error) {
        if (!error.logged) {
            Object.defineProperty(error, 'logged', { value: true });
            errors.throw(config.log, 'fatal', error, {
                config: config
                , options: options
            }, null);
        }
    });
}

/**
 * @private
 * @description Extract an oAuth token from the server response
 * 
 * @param {object} response - Response from the oAuth server
 *
 * @throws {module:errors.TokenParseError}
 * 
 * @returns {string} New oAuth token
 */
function parseToken(response) {
    if (!response.headers || !response.headers.location) {
        // Response header is not found
        throw new errors.TokenParseError(null, new ReferenceError('\'location\' is not defined in \'headers\' object'));
    }
    try {
        // Parse the header to extract the token
        var token = url.parse(response.headers.location).hash
            .split('#')[1].split('&')[0].split('=')[1];
    } catch (error) {
        // Error thrown while parsing header
        throw new errors.TokenParseError(response.headers.location, error);
    }
    if (typeof token !== 'string' || token.length < 10) {
        // Unspecified parsing error without an exception
        throw new errors.TokenParseError(response.headers.location, new TypeError(token));
    }
    return token;
}

/**
 * @private
 * @description Wrap the request in a Promise and expand error handling to '4xx/5xx/etc.' responses
 * @param options - Request options
 * @returns {Promise}
 */
function requestAsync(options) {
    return new Promise(function (resolve, reject) {
        request(options, function (error, response) {
            error = errors(error, response);
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        })
    });
}
