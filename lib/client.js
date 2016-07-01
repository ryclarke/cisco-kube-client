'use strict';
require('sugar');
var Promise = require('bluebird')
  , bunyan = require('bunyan')
  , endpoints = require('./endpoints')
  , errors = require('./errors')
  , auth = require('./auth')
  , spec = require('./spec');

/**
 * @name call
 * @public
 * @function
 * @memberof module:client
 * @description Initialize a new Kubernetes Client with the given configuration
 *
 * @param {object|module:client~ClientConfig} config - Client configuration options
 * 
 * @returns {module:client.KubernetesClient|Promise.<module:client.KubernetesClient>}
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
 * @param {string|boolean} [options.oshift] - Define OpenShift API resource endpoints
 * @param {string|boolean} [options.extensions] - Define Kubernetes Extensions API resource endpoints
 * @param {string|boolean} [options.beta] - (deprecated) Alias for  options.extensions
 *
 * @param {APISpecification[]} [options.apis] - List of additional API specifications to define
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
function KubernetesClient(options) {
    var self = this;
    
    /**
     * @name config
     * @memberof module:client.KubernetesClient#
     * @description Client object configuration
     * @type {module:client~ClientConfig}
     */
    Object.defineProperty(this, 'config', {
        value: (options instanceof ClientConfig) ? options : new ClientConfig(options)
    });
    this.config.log.debug('client initialization options parsed');
    
    // Define all Kubernetes API resources for the core version
    try {
        this.defineAPI(spec.Kubernetes[this.config.version]);
    } catch (error) {
        errors.throw(this.config.log, 'fatal', error); // Log client configuration error
    }

    // Define Kubernetes Extensions API resources
    // Matches the latest beta version that matches the base version by default (if options.beta === true)
    if (options.beta) {
        options.extensions = options.beta;
    }
    if (options.extensions) {
        if (typeof options.extensions === 'boolean') {
            options.extensions = Object.keys(spec.KubernetesExtensions)
                .sort().reverse().find(new RegExp('^' + this.config.version + 'beta'));
        }
        try {
            this.defineAPI(spec.KubernetesExtensions[parseVersion(options.extensions, spec.KubernetesExtensions)]);
        } catch (error) {
            errors.throw(this.config.log, 'fatal', error); // Log client configuration error
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
            errors.throw(this.config.log, 'fatal', error); // Log client configuration error
        }
    }

    // Define endpoints for all additional API extensions
    (options.apis || []).each(self.defineAPI);

    this.config.log.info({host: this.config.host, namespace: this.config.namespace}, 'client initialized');
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
 * @param {boolean} [flush=false] - Delete the client's token if it already exists
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
    if (!spec) {
        spec = {};
    }

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
    if (!this.hasOwnProperty('spec')) {
        Object.defineProperty(this, 'spec', { value: {} });
    }
    
    // Define all of the resource endpoints for the API
    Object.keys(api.spec, function (endpoint, spec) {
        Object.defineProperty(self.spec, endpoint, { enumerable: true, writable: true, value: spec });
        self.createEndpoint(endpoint, Object.merge({
            options: { version: api.name, prefix: api.prefix }
        }, spec, true));
    });
    this.config.log.debug({prefix: api.prefix}, 'api endpoints created: ' + api.name);
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
 * @param {object} [options.authOptions={}] - Sets
 * `ClientConfig#[authOptions]{@link module:client~ClientConfig#authOptions}`
 * @param {boolean} [options.authOptions.allowUnsafe=false] - Permit authentication without SSL/TLS
 * @param {boolean} [options.authOptions.preserveAuth=true] - Keep user credentials for re-authentication
 * @param {!string} options.host - Sets
 * `ClientConfig#[host]{@link module:client~ClientConfig#host}`
 * @param {string} [options.hostname] - Alias for the `host` parameter
 * @param {string|number} [options.logLevel=bunyan.FATAL] - Set log output level (equivalent to logOptions.level)
 * @param {object} [options.logOptions={}] - Configure options for the bunyan logger
 * @param {?string} [options.namespace=null] - Sets
 * `ClientConfig#[namespace]{@link module:client~ClientConfig#namespace}`
 * @param {string|number} [options.port] - Sets port component of `ClientConfig#host`
 * @param {string} [options.protocol] - Sets protocol component of `ClientConfig#host`
 * @param {object} [options.requestOptions={}] - Sets
 * `ClientConfig#[requestOptions]{@link module:client~ClientConfig#requestOptions}`
 * @param {?number} [options.timeout=null] - Sets
 * `ClientConfig#[timeout]{@link module:client~ClientConfig#timeout}`
 * @param {?string} [options.token=null] - Sets
 * `ClientConfig#[token]{@link module:client~ClientConfig#token}`
 * @param {!string|number} options.version - Sets
 * `ClientConfig#[version]{@link module:client~ClientConfig#version}`
 *
 * @throws {TypeError|module:errors.ParameterError|module:errors.VersionError}
 */
function ClientConfig(options) {
    /**
     * @private
     * @name log
     * @memberof module:client~ClientConfig#
     * @description Configurable bunyan logger for the client object
     * @type {!bunyan}
     * @readonly
     */
    if (!options.logLevel) {
        options.logLevel = bunyan.FATAL;
    }
    Object.defineProperty(this, 'log', {
        value: bunyan.createLogger(Object.merge({
            name: 'cisco-kube-client', level: options.logLevel
            , serializers: bunyan.stdSerializers
        }, options.logOptions || {}, true))
    });

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
    if (options.auth) {
        if (!options.auth.user) {
            if (options.auth.username) {
                options.auth.user = options.auth.username;
            } else {
                errors.throw(this.log, 'fatal', new errors.ParameterError('auth.user'));
            }
        }
        if (!options.auth.pass) {
            if (options.auth.password) {
                options.auth.pass = options.auth.password;
            } else {
                errors.throw(this.log, 'fatal', new errors.ParameterError('auth.pass'));
            }
        }
        Object.defineProperty(this, 'auth', { writable: true, enumerable: true
            , value: Object.create(Object.prototype, {
                /** @name options.auth */
                user: { enumerable: true, value: trim(options.auth.user, 'auth.user') }
                , pass: { value: trim(options.auth.pass, 'auth.pass') }
            })
        });
    } else {
        Object.defineProperty(this, 'auth', { writable: true, value: null });
    }

    /**
     * @name authOptions
     * @memberof module:client~ClientConfig#
     * @description Request options for authentication
     *
     * Contained properties are passed directly to the request module and override the default configuration for token
     * requests. Consult the documentation for the `request` module (linked below) for information on valid properties.
     *
     * @see https://github.com/request/request
     *
     * @type {object}
     * @readonly
     * @default {}
     */
    Object.defineProperty(this, 'authOptions', { enumerable: true, value: options.authOptions || {} });

    /**
     * @name host
     * @memberof module:client~ClientConfig#
     * @description Kubernetes API server host
     *
     * Defines the full URL endpoint for the API server, including protocol and port. If port or protocol are excluded
     * from the host specification, then the ClientConfig will look for them as `port` or `protocol` input parameters,
     * respectively. If they are not defined in either format then the default values will be used to complete the URL.
     *
     * Default if only hostname is provided: `https://{hostname}`
     *
     * @type {!string}
     * @readonly
     * @example 'http://localhost:8080'
     */
    if (!options.host) {
        if (options.hostname) {
            options.host = options.hostname;
        } else {
            errors.throw(this.log, 'fatal', new errors.ParameterError('host'));
        }
    }
    // Trim hostname and remove trailing slash
    options.host = trim(options.host, 'host').replace(/\/$/, '');

    // Host definition is missing protocol component. Check the protocol parameter, or use the default.
    if (!options.host.has(/^[a-z]+:\/\//)) {
        options.host = trim(options.protocol || 'https', 'protocol').replace(/:\/+/, '') + '://' + options.host;
    }
    // Host definition is missing port component. Check the port parameter, or use the default.
    if (!options.host.has(/:[0-9]+$/) && options.port) {
        options.host += ':' + options.port;
    }
    Object.defineProperty(this, 'host', { enumerable: true, value: options.host });

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
    if (options.namespace) {
        Object.defineProperty(this, 'namespace', { enumerable: true, value: trim(options.namespace, 'namespace') });
    } else {
        Object.defineProperty(this, 'namespace', { enumerable: true, value: null });
    }

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
    if (options.token) {
        Object.defineProperty(this, 'token', { writable: true, value: trim(options.token, 'token') });
    } else {
        Object.defineProperty(this, 'token', { writable: true, value: null });
    }

    /**
     * @name requestOptions
     * @memberof module:client~ClientConfig#
     * @description Request options for API endpoints
     *
     * These are passed directly to the request module and override the default configuration for every method. Consult
     * the documentation for the `request` module (linked below) for information on valid properties for this object.
     *
     * The most common use case is to supply custom headers needed by your proxy or API server.
     * 
     * @see https://github.com/request/request
     *
     * @type {object}
     * @readonly
     * @default {}
     */
    Object.defineProperty(this, 'requestOptions', { enumerable: true, value: options.requestOptions || {} });

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
    try {
        Object.defineProperty(this, 'version', {
            enumerable: true
            , value: parseVersion((typeof options.version === 'number')
                ? 'v' + options.version : options.version, spec.Kubernetes)
        });
    } catch (error) {
        errors.throw(this.log, 'fatal', error);
    }
}
Object.defineProperty(ClientConfig.prototype, 'toString', { value: function () {
    return '[ClientConfig ' + this['host'] + ']';
}});

/**
 * @private
 * @description Validate the API version
 * 
 * Returns the given version string if it is a valid version for the API specification. Otherwise throw an error.
 * 
 * @param {string} version - Proposed API version
 * @param {object.<APISpecification>} spec - API group to check for the version
 * 
 * @returns {string}
 *
 * @throws {module:errors.ParameterError|module:errors.VersionError}
 */
function parseVersion(version, spec) {
    if (!version) {
        throw new errors.ParameterError('version');
    }
    if (Object.keys(spec).none(version)) {
        throw new errors.VersionError(version, spec);
    } else {
        return version;
    }
}

/**
 * @private
 * @description Trim whitespace and newlines
 * 
 * Throws a TypeError if the string manipulations fail
 * 
 * @param {string} value - String to trim
 * @param {string} name - Name of the string variable
 * 
 * @throws {TypeError}
 */
function trim(value, name) {
    try {
        return value.trim().replace(/\n/, '');
    } catch(ignore) {
        throw new TypeError('parameter \'' + name + '\' must be a string');
    }
}
