'use strict';
require('sugar');
var WatchEmitter = require('./watch-emitter')
  ,  Promise = require('bluebird')
  , request = require('request')
  , errors  = require('./errors');

/**
 * @private
 * @name EventEmitter
 * @property prototype
 */

/**
 * @name call
 * @public
 * @function
 * @memberof module:endpoints
 * @description Initialize a new `Endpoint` object with the given configuration
 *
 * @param {module:client.KubernetesClient} client - Reference to the parent
 * [KubernetesClient]{@link module:client.KubernetesClient} object
 * @param {string} resource - Resource endpoint name
 * @param {NestedResourceDefinition[]} nested - List of nested endpoints
 * @param {object} options - Endpoint-wide request options
 *
 * @returns {module:endpoints~Endpoint}
 */
/**
 * @module endpoints
 * @description  API Resource Endpoints Module
 */
module.exports = function CreateEndpoint(client, resource, nested, options) {
    var endpoint;
    switch (resource) {
        case 'nodes':
            endpoint = NodesEndpoint;
            break;
        case 'replicationControllers':
            endpoint = ReplicationControllersEndpoint;
            break;
        default:
            endpoint = Endpoint;
            break;
    }
    return new endpoint(client, resource, nested, options);
};

/**
 * @class
 * @inner
 * @memberof module:endpoints
 * 
 * @summary Kubernetes API Endpoint
 * @classdesc Exposes all methods for an API resource endpoint. If there are any nested resources,
 * they are exposed as methods of the parent resource. The HTTP verb used for the nested resource
 * is prepended to the name.
 *
 * @description Define a new `Endpoint` object corresponding to a resource on the API
 * server. Specify options to override the library defaults for this endpoint.
 * 
 * @this {module:endpoints~Endpoint}
 * 
 * @param {module:client.KubernetesClient} client - Sets `Endpoint#[client]{@link module:endpoints~Endpoint#client}`
 * @param {string} resource - Sets `Endpoint#[resource]{@link module:endpoints~Endpoint#resource}`
 * @param {?NestedResourceDefinition[]} [nested] - List of nested endpoints
 * @param {?object} [options] - Sets `Endpoint#[options]{@link module:endpoints~Endpoint#options}`
 * @param {string} options.version - API version name
 * @param {string} [options.prefix] - Custom API prefix
 * @param {string[]} [options.methods] - If defined, only the listed base methods will be available to the Endpoint
 */
function Endpoint(client, resource, nested, options) {
    var self = this;
    
    if (!options) {
        options = { version: client.config.version };
    }
    /**
     * @name client
     * @memberof module:endpoints~Endpoint#
     * @description Reference to the parent client object
     * @type {module:client.KubernetesClient}
     */
    Object.defineProperty(this, 'client', { value: client });
    /**
     * @name options
     * @memberof module:endpoints~Endpoint#
     * @description Endpoint option overrides
     * @type {?object}
     */
    Object.defineProperty(this, 'options', { value: options });
    if (!this.options.prefix) {
        this.options.prefix = (this.options.version.has('/')) ? 'apis' : 'api';
    }
    /**
     * @name resource
     * @memberof module:endpoints~Endpoint#
     * @description Server resource name
     * @type {string}
     */
    Object.defineProperty(this, 'resource', { value: resource });
    /**
     * @private
     * @name _log
     * @memberof module:endpoints~Endpoint#
     * @description Bunyan logger for the Endpoint
     * @type {bunyan}
     */
    Object.defineProperty(this, '_log', { value: this.client.config.log.child({
        endpoint: getPath(this.options.prefix, this.options.version, resource)
    })});

    // Add nested resource endpoints
    (nested || []).each(function (each) {
        Object.defineProperty(self, each.resource, {
            enumerable: true
            , value: new Endpoint(self.client, self.resource, null, Object.merge({
                child: each.resource
                , methods: each.methods
            }, self.options, true, false))
        });
    });

    // Remove invalid methods from endpoints
    if (this.options.methods) {
        Object.keys(Object.getPrototypeOf(this), function (each) {
            if (self.options.methods.none(each)) {
                Object.defineProperty(self, each, { value: undefined });
            }
        });
        delete this.options.methods;
    }

    // Expose prototype methods as enumerable properties
    Object.keys(Object.getPrototypeOf(this), function (key, value) {
        if (self[key]) {
            Object.defineProperty(self, key, { enumerable: true, value: value });
        }
    });
}
Object.defineProperty(Endpoint.prototype, 'toString', { value: function () {
    return '[Endpoint ' + this.resource + ']';
}});

/**
 * @private
 * @description Base request method wrapper for API resource endpoints
 *
 * If opts is omitted from the parameter list, it will be checked as a possible candidate for the callback.
 * 
 * @param {module:endpoints~Endpoint} self - Endpoint object making the request
 * @param {string} method - Method verb for the request
 * @param {?string} query - Server resource name
 * @param {?object} body - Resource object to send
 * @param {?object} opts - Method options
 * @param {boolean} [opts.verbose=false] - Return full response instead of body only
 * @param {?string} [opts.child] - Name of nested child resource
 * @param {?function|*} next - Node.js callback (replaces Promise output)
 *
 * @returns {?Promise.<KubernetesResource|KubernetesList>} Promise of the response body from the API server
 */
function baseRequest(self, method, query, body, opts, next) {
    if (typeof opts === 'function') {
        next = opts;    // Parameter 'opts' is optional and can be safely dropped
        opts = null;    // baseRequest(self, method, query, body, next)
    }
    return self.client.authenticate().then(function (config) {
        // Safely merge options objects - precedence: request > endpoint > default
        opts = Object.merge(Object.clone(self.options || {}), opts || {}, true);
        
        // Collapse and parse request options
        opts = parseOptions(Object.merge({
            resource: self.resource
            , query: getPath(query, opts.child)
            , method: method
            , body: body
        }, opts, true), config);

        // Send request to API server
        return requestAsync(opts).catch(function (error) {
            if (error.statusCode == 401) {
                // Refresh the auth token and repeat the request
                return self.client.authenticate(true).then(function (config) {
                    /** @name opts.headers */
                    opts.headers.Authorization = 'Bearer ' + config.token;
                    return requestAsync(opts);
                });
            } else {
                throw error;
            }
        });
    }).then(function (response) {
        // Coerce response body into JSON
        if (typeof response.body === 'string') {
            response.body = JSON.parse(response.body);
        }
        self._log.info({opts: opts});
        return (opts.verbose) ? response : response.body;
    }).catch(function (error) {
        /** @name error.logged */
        if (!error.logged) {
            Object.defineProperty(error, 'logged', { value: true });
            errors.throw(self._log, error.code === 'ENOTFOUND' ? 'fatal' : 'error', error, {
                config: self.client.config
                , options: opts
            }, null);
        }
    }).nodeify(next);
}

/**
 * @public
 * @description Request resources from the API server
 * 
 * Corresponds to the 'GET' http method.
 *
 * Missing parameters can be stripped from the beginning of the parameter list and will be checked for type
 * appropriately. If `query` is not defined, the returned `Promise` will be for a KubernetesList. Otherwise
 * it will be a `Promise` for a KubernetesResource.
 *
 * @param {?string} [query] - Server resource name
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 * 
 * @returns {?Promise.<KubernetesResource|KubernetesList>}
 */
Endpoint.prototype.get = function (query, opts, next) {
    if ((typeof query === 'object' && query !== null) || typeof query === 'function') {
        next = opts;    // parameter 'query' is optional and can be safely dropped
        opts = query;   // get(opts, next)
        query = null;   // get(next)
    }
    if (!query && this.options.list === false) {
        return Promise.reject(new Error('query is required for this endpoint'));
    }
    this._log.info({
        query: query || null
        , namespace: (opts || {}).namespace || this.client.config.namespace
    }, 'getting ' + this.resource);
    return baseRequest(this, 'GET', query, null, opts, next);
};

/**
 * @public
 * @description Create new resource on the API server
 * 
 * Corresponds to the 'POST' http method.
 *
 * @param {KubernetesResource|*} body - Resource object to send
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 *
 * @returns {?Promise.<KubernetesResource>}
 */
Endpoint.prototype.create = function (body, opts, next) {
    this._log.info({
        namespace: (opts || {}).namespace || this.client.config.namespace
    }, 'creating ' + this.resource);
    return baseRequest(this, 'POST', null, body, opts, next);
};

/**
 * @public
 * @description Update resource on the API server
 *
 * Corresponds to the 'PUT' http method.
 * 
 * @param {string} query - Server resource resource
 * @param {KubernetesResource|*} body - Resource object to send
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 *
 * @returns {?Promise.<KubernetesResource>}
 */
Endpoint.prototype.update = function (query, body, opts, next) {
    this._log.info({
        query: query
        , namespace: (opts || {}).namespace || this.client.config.namespace
    }, 'updating ' + this.resource);
    return baseRequest(this, 'PUT', query, body, opts, next);
};

/**
 * @public
 * @description Partially update resource on the API server
 *
 * Corresponds to the 'PATCH' http method.
 *
 * Currently only the `application/strategic-merge-patch+json` content type is supported by default, but other types may
 * be used by manually setting the `Content-Type` header in the method options.
 * 
 * @param {string} query - Server resource resource
 * @param {object} body - Resource patch to send
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 *
 * @returns {?Promise.<KubernetesResource>}
 */
Endpoint.prototype.patch = function (query, body, opts, next) {
    this._log.info({
        query: query
        , namespace: (opts || {}).namespace || this.client.config.namespace
    }, 'patching ' + this.resource);
    return baseRequest(this, 'PATCH', query, body, opts, next);
};

/**
 * @public
 * @description Delete resource on the API server
 *
 * Corresponds to the 'DELETE' http method.
 *
 * @param {string} query - Server resource resource
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 *
 * @returns {?Promise.<KubernetesResource>}
 */
Endpoint.prototype.delete = function (query, opts, next) {
    this._log.info({
        query: query
        , namespace: (opts || {}).namespace || this.client.config.namespace
    }, 'deleting ' + this.resource);
    return baseRequest(this, 'DELETE', query, null, opts, next);
};

/**
 * @public
 * @description Watch server resource(s) for changes
 *
 * Corresponds to the 'GET' http method with the `watch` query parameter set.
 *
 * Gets the current state of the requested resources and returns a custom event emitter (see below) with the current
 * state set to the `initialState` property. Watch events will not be received until the `start` method is called on the
 * emitter. This allows the user to define all event listeners before requesting events from the API server and prevent
 * events from being missed during the initial setup.
 * 
 * Missing parameters can be stripped from the beginning of the parameter list and will be checked for type
 * appropriately. If query is not defined, the watched resource will be a KubernetesList. Otherwise it will be a
 * KubernetesResource.
 *
 * @param {?string} [query] - Server resource resource
 * @param {?object|*} [opts] - Method options
 * @param {boolean} [opts.verbose=false] - Return full response instead of body only
 * @param {?string} [opts.child] - Name of nested child resource
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @this {module:endpoints~Endpoint}
 *
 * @returns {module.endpoints~WatchEmitter}
 */
Endpoint.prototype.watch = function (query, opts, next) {
    var self = this;
    if ((typeof query === 'object' && query !== null) || typeof query === 'function') {
        next = opts;    // Parameter 'query' is optional and can be safely dropped
        opts = query;   // watch(opts, next)
        query = null;   // watch(next)
    }
    if (typeof opts === 'function') {
        next = opts;    // Parameter 'opts' is optional and can be safely dropped
        opts = null;    // watch(query, next)
    }
    return this.get(query, opts, next).then(function (response) {
        // Safely merge options objects - precedence: request > endpoint > default
        opts = Object.merge(Object.merge({timeout: null}, self.options || {}, true, false), opts || {}, true);
        if (opts.hasOwnProperty('verbose')) delete opts.verbose;
        
        // Set up request listeners
        return new WatchEmitter(response, parseOptions(Object.merge({
            resource: self.resource
            , query: getPath(query, opts.child)
            , method: 'GET'
            , qs: { watch: true, resourceVersion: response.metadata.resourceVersion }
        }, opts, true), self.client.config), self._log);
    }).nodeify(next);
};

/**
 * @class
 * @inner
 * @memberof module:endpoints
 * @extends module:endpoints~Endpoint
 * 
 * @summary Kubernetes API Endpoint for Nodes
 * @classdesc Extended endpoint for 'nodes'
 *
 * @description Define a new `NodesEndpoint` object.
 */
function NodesEndpoint(client, resource, nested, options) {
    Endpoint.call(this, client, resource, nested, options);
    Object.merge(this, Endpoint.prototype, true, false);
}
NodesEndpoint.prototype = Object.create(Endpoint.prototype);
Object.defineProperty(NodesEndpoint, 'constructor', {
    value: NodesEndpoint
});

/**
 * @public
 * @description Find all pods running on the given node
 *
 * @param {string} query - Server resource resource
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise<KubernetesList>} - Resolves to the response body from the API server
 */
NodesEndpoint.prototype.getPods = function (query, opts, next) {
    if (typeof opts === 'function') {
        next = opts;
        opts = null;
    }
    return this.client.pods.get(Object.merge({fields: { 'spec.nodeName': query}}, opts || {}, true), next);
};

/**
 * @public
 * @description Apply the same patch to all pods on a node
 *
 * @param {string} query - Server resource resource
 * @param {object} body - The patch object to apply
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise<KubernetesList>} - Resolves to the response body from the API server
 */
NodesEndpoint.prototype.patchPods = function (query, body, opts, next) {
    var self = this;
    var podList;
    if (typeof opts === 'function') {
        next = opts;
        opts = null;
    }
    return this.getPods(query, opts).then(function (pods) {
        podList = pods;
        return pods.items;
    }).map(function (pod) {
        return self.client.pods.patch(pod.metadata.name, body, {
            namespace: pod.metadata.namespace
        }).then(function (pod) {
            delete pod.kind;
            delete pod.apiVersion;
            return pod;
        });
    }).then(function (pods) {
        podList.items = pods;
        return podList;
    }).nodeify(next);
};

/**
 * @public
 * @description Delete all pods on the given node
 *
 * @param {string} query - Server resource resource
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise<KubernetesList>} - Resolves to the response body from the API server
 */
NodesEndpoint.prototype.deletePods = function (query, opts, next) {
    var self = this;
    var podList;
    if (typeof opts === 'function') {
        next = opts;
        opts = null;
    }
    return this.getPods(query, opts).then(function (pods) {
        podList = pods;
        return pods.items;
    }).map(function (pod) {
        return self.client.pods.delete(pod.metadata.name, {namespace: pod.metadata.namespace});
    }).then(function (pods) {
        podList.items = pods;
        return podList;
    }).nodeify(next);
};

/**
 * @public
 * @description Remove a node from the scheduling pool and remove its pods
 *
 * @param {string} query - Server resource resource
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise.<KubernetesResource>} - Resolves to the response body from the API server
 */
NodesEndpoint.prototype.evacuate = function (query, opts, next) {
    var self = this;
    if (typeof opts === 'function') {
        next = opts;
        opts = null;
    }
    return this.patch(query, {
        spec: { unschedulable: true }
    }, opts).tap(function (node) {
        return self.deletePods(node.metadata.name);
    }).nodeify(next);
};

/**
 * @public
 * @description Define a node as schedulable by the API server
 *
 * @param {string} query - Server resource name
 * @param {?object} [opts] - Method options
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise.<KubernetesResource>} - Resolves to the response body from the API server
 */
NodesEndpoint.prototype.schedule = function (query, opts, next) {
    return this.patch(query, {
        spec: {unschedulable: false}
    }, opts, next);
};

/**
 * @class
 * @inner
 * @memberof module:endpoints
 * @extends module:endpoints~Endpoint
 * 
 * @summary Kubernetes API Endpoint for ReplicationControllers
 * @classdesc Extended endpoint for 'replicationControllers'
 *
 * @description Define a new `ReplicationControllersEndpoint` object.
 */
function ReplicationControllersEndpoint(client, resource, nested, options) {
    Endpoint.call(this, client, resource, nested, options);
    Object.merge(this, Endpoint.prototype, true, false);
}
ReplicationControllersEndpoint.prototype = Object.create(Endpoint.prototype);
Object.defineProperty(ReplicationControllersEndpoint.prototype, 'constructor', {
    value: ReplicationControllersEndpoint
});

/**
 * @public
 * @description Scale the Replication Controller's replica count
 *
 * Specify a negative increment to scale down.
 *
 * @param {string} query - Server resource name
 * @param {number} [increment=1] - Number of replicas to add
 * @param {?object} [opts] - Method options
 * @param {boolean} [opts.prune=false] - Delete replication controller if replicas becomes 0
 * @param {?function|*} [next] - Node.js callback (replaces Promise output)
 *
 * @returns {Promise} - Resolves to the response body from the API server
 */
ReplicationControllersEndpoint.prototype.scale = function (query, increment, opts, next) {
    var self = this;
    if (typeof opts === 'function') {
        next = opts;
        opts = null;
    }
    var prune = (opts) ? !!opts.prune : false;
    if (opts && opts.hasOwnProperty('prune')) delete opts.prune;
    return self.get(query, opts).then(function (rc) {
        var count = rc.spec.replicas + (increment || 1);
        if (count < 0) count = 0;
        return self.patch(query, { spec: { replicas: count }}, {namespace: rc.metadata.namespace});
    }).then(function (rc) {
        if (prune && rc.spec.replicas === 0) {
            return self.delete(query);
        } else return rc;
    }).nodeify(next);
};

/**
 * @global
 * @typedef {object} RequestOptions
 * @description Options for an API request method
 * 
 * Additional properties not recognized by the underlying `request` module are documented below.
 * 
 * @property {string} endpoint - Target API resource endpoint
 * @property {string} method - Request method verb
 * @property {object} [body] - Request body for PUT/POST/PATCH methods
 * @property {boolean} [json] - Request body is encoded in JSON format
 * @property {string} [namespace] - Namespace for the request
 * @property {string} [version] - API version
 * @property {string} [prefix] - API path prefix
 * @property {object} [labels] - Filter results by label
 * @property {object} [fields] - Filter results by field
 */

/**
 * @private
 * @description Parse options for an API request
 *
 * @param {object} options - Method request options
 * @param {module:client~ClientConfig} config - Client configuration
 *
 * @returns {object} - Parsed method options
 */
function parseOptions(options, config) {
    options = Object.clone(options, true);
    var resource = options.resource
      , query = options.query
      , version = options.version
      , prefix = options.prefix;
    delete options.resource;
    delete options.query;
    delete options.version;
    delete options.prefix;

    // Define request namespace
    var ns;
    if (!options.hasOwnProperty('ns') || options.ns) {
        if (options.hasOwnProperty('namespace')) {
            ns = options.namespace;
            delete options.namespace;
        } else {
            ns = config.namespace;
        }
    } else {
        ns = null;
    }
    if (options.hasOwnProperty('ns')) {
        delete options.ns;
    }

    // Parse label selectors and add to request options
    if (options.labels) {
        options = Object.merge({
            qs: { labelSelector: parseFilter(options.labels) }
        }, options, true);
        delete options.labels;
    }

    // Parse field selectors and add to request options
    if (options.fields) {
        options = Object.merge({
            qs: { fieldSelector: parseFilter(options.fields) }
        }, options, true);
        delete options.fields;
    }

    // Version compatibility handling
    switch (version) {
    case 'v1beta1': // Legacy support for minions endpoints
    case 'v1beta2': //  and query string namespaces
        resource = resource.replace('nodes', 'minions');
        if (ns) {
            options = Object.merge(options, {
                qs: { namespace: ns }
            }, true);
        }
        break;

    case 'v1beta3': // New versions use lowercase endpoint
    case 'v1':      //  names and path namespaces
    default:
        resource = resource.toLowerCase();
        if (ns) {
            resource = getPath('namespaces', ns, resource);
        }
        break;
    }

    // Set correct proxy endpoints
    if (resource.match(/^proxy\//)) {
        resource = 'proxy/' + resource.replace('proxy/', '');
    }

    // Set Content-Type header for PATCH methods
    if (options.method === 'PATCH') {
        options = Object.merge({
            headers: {
                'Content-Type': 'application/strategic-merge-patch+json'
            }
        }, options, true);
    }

    // Set json and body options for PUT/POST/PATCH methods
    if (options.body) {
        if (typeof options.body === 'object') {
            options.json = true;
        }
    }

    // Update request endpoint with base options
    return Object.merge(options, {
        url: getPath(config.host, prefix, version, resource, query)
        , auth: Object.create(Object.prototype, {
            bearer: { enumerable: true, value: config.token }
        })
    }, true);
}

/**
 * @private
 * @description Convert a label or field selector object to a valid query string
 *
 * Each key in the object should be a string to match against.
 * Prepend '_' (underscore) to the key resource to invert the match.
 *
 * Labels only:
 *     The key value may also be an array, to allow for set-based
 *     label matching as with 'in' and 'notin'. The value may also
 *     be an empty string, which will match all resources with the
 *     label regardless of value.
 *
 * @param {object} object - Method options
 *
 * @returns {string} - Formatted query string for fieldSelector or labelSelector
 */
function parseFilter(object) {
    var selectors = [];
    Object.keys(object, function (key, value) {
        var filter = '';
        // Match all resources with the given label
        if (value === '') {
            filter += key;

        // Match the label or field value against the string
        } else if (typeof value === 'string') {
            if (key.startsWith('_')) {
                key = key.replace('_', '');
                filter += key + '!=' + value;
            } else {
                filter += key + '=' + value;
            }

        // Match the label value against the list
        } else if (typeof value === 'object') {
            if (key.startsWith('_')) {
                key = key.replace('_', '');
                filter += key + ' notin (' + value + ')';
            } else {
                filter += key + ' in (' + value + ')';
            }
        }
        selectors.push(filter);
    });
    return selectors.toString();
}

/**
 * @private
 * @description Parse all arguments into an API path fragment
 *
 * @returns {string} - All non-empty arguments joined by '/'
 */
function getPath() {
    // Convert arguments to true array and filter null values
    return Array.prototype.filter.call(arguments, function (each) {
        return each !== null && each !== undefined && each !== '';
    }).join('/');
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
