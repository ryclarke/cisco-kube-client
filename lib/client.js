'use strict';
require('sugar');
var Promise = require('bluebird')
  , bunyan = require('bunyan')
  , endpoints = require('./endpoints.min')
  , errors = require('./errors.min')
  , auth = require('./auth.min')
  , spec = require('./spec.min');

/**
 * @name call
 * @public
 * @function
 * @memberof module:client
 * @description Initialize a new Kubernetes Client with the given configuration
 *
 * @param {object|module:client~ClientConfig} config - Client configuration options
 * @param {number|string} [config.logLevel=bunyan.FATAL] - Level of log data to display
 * @param {boolean} [config.beta=false] - Enable the core API beta extensions
 * @param {boolean} [config.oshift=false] - Enable the OpenShift API endpoints
 * @param {array} [config.extensions] - List of additional API extension specifications to include
 * @param {boolean} [config.usePromise=false] - Wrap the initialized client in a [Promise]{http://bluebirdjs.com}
 *
 * @returns {module:client.KubernetesClient|bluebird|Promise.<module:client.KubernetesClient>}
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
/**
 * @module client
 * @description Kubernetes API Client Module
 */
module.exports = function CreateClient(config) {
    if (config.usePromise) {
        return new Promise(function (resolve) {
            resolve(new KubernetesClient(config));
        });
    } else {
        return new KubernetesClient(config);
    }
};
module.exports.spec = spec;

/**
 * @class
 * @static
 * @memberof module:client
 *
 * @summary Kubernetes API Client
 * @classdesc Initialized KubernetesClient objects are used to interface with the Kubernetes API server specified in
 * the [ClientConfig]{@link module:client~ClientConfig}. The client's [Endpoint]{@link module:endpoints~Endpoint}
 * properties are generated at runtime from the [Kubernetes resource specification]{@link KubernetesSpecification}.
 *
 * @description Create a new `KubernetesClient` object. If the given object is not of type `ClientConfig` then it is
 * used as input to the `ClientConfig` constructor to define a new one. Parses the Kubernetes API spec to generate
 * `Endpoint` properties.
 *
 * @param {object|module:client~ClientConfig} options - Sets
 * `KubernetesClient#[config]{@link module:client.KubernetesClient#config}`
 *
 * @param {number|string} [options.logLevel=bunyan.FATAL] - Maximum log output level
 * @param {string|boolean} [options.oshift] - Define OpenShift API resource endpoints
 * @param {string|boolean} [options.beta] - Define Kubernetes beta API resource endpoints
 *
 * @param {APISpecification[]} [options.apis] - List of API specifications to define
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
function KubernetesClient(options) {
    var self = this;

    /**
     * @private
     * @name log
     * @memberof module:client.KubernetesClient#
     * @description Bunyan logger for the Client
     * @type {bunyan}
     */
    Object.defineProperty(this, 'log', {
        value: bunyan.createLogger({ name: 'cisco-kube-client', level: options.logLevel || bunyan.FATAL })
    });
    /**
     * @name config
     * @memberof module:client.KubernetesClient#
     * @description Client object configuration
     * @type {module:client~ClientConfig}
     */
    try {
        Object.defineProperty(this, 'config', {
            value: (options instanceof ClientConfig) ? options : new ClientConfig(options)
        });
        this.log.debug('client initialization options parsed');
    } catch (error) {
        this.log.fatal(error);  // Log client configuration errors
        throw error;
    }
    // Define all Kubernetes API resources for the core version
    try {
        this.defineAPI(spec.Kubernetes[this.config.version]);
    } catch (error) {
        this.log.fatal(error);  // Log client configuration error
        throw error;
    }

    // Define beta API resources for the given version
    // Matches the latest beta version that matches the base version by default (if options.beta === true)
    if (options.beta) {
        if (typeof options.beta === 'boolean') {
            options.beta = Object.keys(spec.KubernetesBeta)
                .sort().reverse().find(new RegExp('^' + this.config.version + 'beta'));
        }
        try {
            this.defineAPI(spec.KubernetesBeta[parseVersion(options.beta, spec.KubernetesBeta)]);
        } catch (error) {
            this.log.fatal(error);  // Log client configuration error
            throw error;
        }
    }

    // Define all OpenShift API resources for the given version
    // Matches the Kubernetes API version by default (if options.oshift === true)
    if (options.oshift) {
        if (typeof options.oshift === 'boolean') {
            options.oshift = this.config.version;
        }
        try {
            this.defineAPI(spec.OpenShift[parseVersion(options.oshift, spec.OpenShift)]);
        } catch (error) {
            this.log.fatal(error);  // Log client configuration error
            throw error;
        }
    }

    // Define endpoints for all API extensions
    if (options.apis) {
        //this.log.info('Defining endpoints for Kubernetes API extensions');
        options.apis.each(function (api) {
            self.defineAPI(api);
        });
    }
    
    this.log.info({host: this.config.host, namespace: this.config.namespace}, 'client initialized');
}
/** @private */
KubernetesClient.prototype.toString = function () {
    return '[KubernetesClient \'' + this.config.host + '\']';
};

/**
 * @public
 * @description Authenticate with the oAuth server
 *
 * The new token is added to the [ClientConfig]{@link module:client~ClientConfig}.
 * Returns a `Promise` of the updated `ClientConfig` with the new token parameter.
 *
 * @see {@link module:auth}
 *
 * @param {boolean} flush - Delete the client's token if it already exists
 * @param {function} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {?Promise.<module:client~ClientConfig>}
 */
KubernetesClient.prototype.authenticate = function(flush, next) {
    return auth(this.config, flush, next);
};

/**
 * @public
 * @description Define a new API server resource endpoint. The returned object will be an instantiated
 * [Endpoint]{@link module:endpoints~Endpoint} or a relevant subtype.
 *
 * @see {@link module:endpoints}
 *
 * @param {string} resource - Resource name
 * @param {?EndpointSpecification} [spec] - Endpoint specification for the resource
 * @param {?string} [spec.name] - Custom name for the endpoint property
 */
KubernetesClient.prototype.createEndpoint = function(resource, spec) {
    if (!spec) spec = {};

    // Define main resource Endpoint
    Object.defineProperty(this, resource, {
        enumerable: true
        , configurable: true
        , value: endpoints(this, resource, spec.nested, spec.options)
    });

    // Link nickname to main resource
    if (spec.nickname) {
        Object.defineProperty(this, spec.nickname, {
            configurable: true
            , value: this[resource]
        });
    }
};

/**
 * @public
 * @description Create all resource endpoints defined in the given API specification
 *
 * @param {APISpecification} api - API endpoints to define
 */
KubernetesClient.prototype.defineAPI = function (api) {
    var self = this;
    
    // Define all of the resource endpoints for the API
    Object.keys(api.spec, function (endpoint, spec) {
        self.createEndpoint(endpoint, Object.merge({
            options: { version: api.name, prefix: api.prefix }
        }, spec, true));
    });
    this.log.debug({prefix: api.prefix}, 'api endpoints created: ' + api.name);
};

/**
 * @class
 * @inner
 * @memberof module:client
 *
 * @summary Kubernetes API Client Configuration
 * @classdesc Describes the configuration of a [KubernetesClient]{@link module:client.KubernetesClient} object. All
 * options relevant to the client initialization are provided as instance properties. The token property is managed
 * by the Auth module if user credentials are given.
 *
 * @description Create a new `ClientConfig` object. The given object will supply the necessary fields to initialize
 * the object. If any required parameters are missing an error will be thrown.
 *
 * @param {object|module:client~ClientConfig} options - Input parameters
 * @param {?object} [options.auth=null] - Sets
 * `ClientConfig#[auth]{@link module:client~ClientConfig#auth}`
 * @param {string} options.auth.user - Client username
 * @param {string} options.auth.pass - Client password
 * @param {?object} [options.authOptions=null] - Sets
 * `ClientConfig#[authOptions]{@link module:client~ClientConfig#authOptions}`
 * @param {!string} options.host - Sets
 * `ClientConfig#[host]{@link module:client~ClientConfig#host}`
 * @param {string} [options.hostname] - Alias for the `host` parameter
 * @param {?string} [options.namespace=null] - Sets
 * `ClientConfig#[namespace]{@link module:client~ClientConfig#namespace}`
 * @param {string|number} [options.port] - Sets port component of `ClientConfig#host`
 * @param {string} [options.protocol] - Sets protocol component of `ClientConfig#host`
 * @param {?object} [options.requestOptions=null] - Sets
 * `ClientConfig#[requestOptions]{@link module:client~ClientConfig#requestOptions}`
 * @param {?int} [options.timeout=null] - Sets
 * `ClientConfig#[timeout]{@link module:client~ClientConfig#timeout}`
 * @param {?string} [options.token=null] - Sets
 * `ClientConfig#[token]{@link module:client~ClientConfig#token}`
 * @param {!string|number} options.version - Sets
 * `ClientConfig#[version]{@link module:client~ClientConfig#version}`
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
function ClientConfig(options) {
    /**
     * @name auth
     * @memberof module:client~ClientConfig#
     * @description User credentials for authentication with the API server
     *
     * Specify a username and password in the object's 'user' and 'pass' properties, respectively. If authentication is
     * handled externally and a valid token has been supplied, or if authentication is not required for the given API
     * server host, then this parameter may be excluded.
     *
     * @type {?object}
     * @readonly
     * @default null
     * @property {string} user - Client username
     * @property {string} pass - Client password
     */
    Object.defineProperty(this, 'auth', { value: options.auth || null });
    /**
     * @name authOptions
     * @memberof module:client~ClientConfig#
     * @description Request options for authentication
     *
     * These are passed directly to the request module and override the default configuration. Consult the documentation
     * for the `request` module (linked below) for information on valid properties for this object.
     *
     * @see https://github.com/request/request
     *
     * @type {?object}
     * @readonly
     * @default null
     */
    Object.defineProperty(this, 'authOptions', { enumerable: true, value: options.authOptions || null });
    /**
     * @name host
     * @memberof module:client~ClientConfig#
     * @description Kubernetes API server host
     *
     * Defines the full URL endpoint for the API server, including protocol and port. If port or protocol are excluded
     * from the host specification, then the ClientConfig will look for them as `port` or `protocol` input parameters,
     * respectively. If they are not defined in either format then the default values will be used to complete the URL.
     *
     * Default if only hostname is provided: `https://{hostname}:8443`
     *
     * @type {!string}
     * @readonly
     * @example 'http://localhost:8080'
     */
    Object.defineProperty(this, 'host', { enumerable: true
        , value: parseHostname(options.host || options.hostname, options.port, options.protocol)
    });
    /**
     * @name namespace
     * @memberof module:client~ClientConfig#
     * @description Default Kubernetes project namespace
     *
     * This is used to restrict the scope of all methods to the given project. If defined, all of the client's methods
     * will use this namespace as their project scope. Individual calls to an API endpoint may override this default by
     * defining the `namespace` property of their request options. An empty namespace is equivalent to the global scope.
     *
     * @type {?string}
     * @readonly
     * @default null
     */
    Object.defineProperty(this, 'namespace', { enumerable: true, value: options.namespace || null });
    /**
     * @name timeout
     * @memberof module:client~ClientConfig#
     * @description Request timeout in milliseconds
     *
     * @type {?number}
     * @readonly
     * @default null
     */
    Object.defineProperty(this, 'timeout', { enumerable: true, value: options.timeout || null });
    /**
     * @name token
     * @memberof module:client~ClientConfig#
     * @description oAuth token for authentication
     *
     * If this is omitted and the `auth` property is set, then the credentials found in `auth` will be used to request
     * a new oAuth token from the API server automatically. Invalid or expired tokens will also be silently refreshed
     * without an error being thrown for the first authentication failure.
     *
     * If the `auth` property is not defined then this token must be set manually for authentication of API requests.
     *
     * @type {?string}
     * @default null
     */
    Object.defineProperty(this, 'token', { writable: true, value: options.token || null });
    /**
     * @name requestOptions
     * @memberof module:client~ClientConfig#
     * @description Request options for API endpoints
     *
     * These are passed directly to the request module and override the default configuration. Consult the documentation
     * for the `request` module (linked below) for information on valid properties for this object.
     *
     * @see https://github.com/request/request
     *
     * @type {?object}
     * @readonly
     * @default null
     */
    Object.defineProperty(this, 'requestOptions', { enumerable: true, value: options.requestOptions || null });
    /**
     * @name version
     * @memberof module:client~ClientConfig#
     * @description Kubernetes API version
     * 
     * If a number is provided, it is converted to a string and prepended with 'v' for compatibility with the
     * Kubernetes API schema for API versions.
     * 
     * @see http://kubernetes.io/docs/api
     *
     * @type {!string}
     * @readonly
     * @example 'v1'
     */
    Object.defineProperty(this, 'version', { enumerable: true
        , value: parseVersion((typeof options.version === 'number')
            ? 'v' + options.version : options.version, spec.Kubernetes)
    });
}
/** @private */
ClientConfig.prototype.toString = function () {
    return '[ClientConfig \'' + this.host + '\']';
};

/**
 * @private
 * @description Parse the given hostname
 * 
 * If necessary, add the given port and protocol to the hostname to produce a fully resolved URL.
 * If either port or protocol is already part of the host string then the separate parameter for
 * that URL component will be ignored. Returns the combined hostname.
 * 
 * @param {string} host - API server hostname or URL
 * @param {?string|number} [port=8433] - Separately defined URL port
 * @param {?string} [protocol='https'] - Separately defined URl protocol
 * 
 * @returns {string}
 *
 * @throws {module:errors.ParameterError}
 */
function parseHostname(host, port, protocol) {
    if (!host) throw new errors.ParameterError('host');
    // Strip trailing slash from host definition
    host = host.replace(/\/$/, '');

    // Host definition is missing protocol component. Check the protocol parameter, or use the default.
    if (!host.has(/^[a-z]+:\/\//)) {
        host = (protocol || 'https') + '://' + host;
    }
    // Host definition is missing port component. Check the port parameter, or use the default.
    if (!host.has(/:[0-9]+$/)) {
        host += ':' + (port || 8443);
    }
    return host;
}

/**
 * @private
 * @description Validate the API version
 * 
 * Returns the given version string if it is a valid version for the given API specification. Otherwise, an
 * error will be thrown.
 * 
 * @param {string} version - Proposed API version
 * @param {object.<APISpecification>} spec - API group to check for the version
 * 
 * @returns {string}
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
function parseVersion(version, spec) {
    if (!version) throw new errors.ParameterError('version');
    
    if (Object.keys(spec).none(version)) {
        throw new errors.VersionError(version, spec);
    } else {
        return version;
    }
}
