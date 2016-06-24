'use strict';
require('sugar');
var Promise = require('bluebird')
  , request = require('request')
  , url     = require('url')
  , errors  = require('./errors.min');

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
    if (config.auth) {
        return getNewToken(config, next);
    } else {
        return Promise.resolve(config).nodeify(next);
    }
};

/**
 * @private
 * @description Request a new token if one is not already defined
 *
 * @param {module:client~ClientConfig} config - Client configuration to update
 * @param {string} config.token - Replace this value with the new oAuth token
 * @param {function} [next] - Node.js callback (replaces Promise output)
 *
 * @throws {module:errors.TokenParseError}
 * 
 * @returns {?Promise.<module:client~ClientConfig>} `ClientConfig` with updated `token` property
 */
function getNewToken(config, next) {
    return new Promise(function (resolve, reject) {
        var authOptions = config.authOptions || {};

        // Skip authentication if the client already has a token, or if 'authOptions.disable' is set
        if (config.token || authOptions.disable) {
            return resolve(config);
        }

        // Permit authentication over HTTP only if 'authOptions.allowUnsafe' is set
        if (!authOptions.allowUnsafe && !config.host.match(/^https:\/\//) {
            errors.throw(config.log.fatal, new errors.ClientError('cannot securely authenticate over http'));
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
        }, authOptions, true);
        request(options, function (error, response) {
            error = errors(error, response);
            if (error) {
                if (error.statusCode == 401) {
                    errors.throw(config.log.fatal, error, null, '401 Unauthorized');
                } else {
                    errors.throw(config.log.fatal, error);
                }
                reject(error);
            } else {
                try {
                    config.token = parseToken(response);
                    resolve(config);
                } catch (error) {
                    errors.throw(config.log.fatal, error);
                }
            }
        });
    }).nodeify(next);
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
