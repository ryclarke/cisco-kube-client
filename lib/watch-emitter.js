require('sugar');
var EventEmitter = require('events')
    , request = require('request')
    , errors  = require('./errors');
/**
 * @class
 * @inner
 * @memberof module:endpoints
 * @extends EventEmitter
 * 
 * @summary Event Emitter for Watch Events
 * @classdesc Parses and propagates watch events from the API server
 * 
 * Call `start` to initialize the watch socket after all listeners have been set up.
 * 
 * @description Initialize a new `WatchEmitter` object.
 * 
 * @param {KubernetesResource|KubernetesList} response - Initial response body
 * @param {object} options - Request options for watch socket
 * 
 * @param logger
 * 
 * @fires event:response
 * @fires event:create
 * @fires event:update
 * @fires event:delete
 * @fires event:error
 */
function WatchEmitter(response, options, logger) {
    EventEmitter.call(this);
    /**
     * @name started
     * @memberof module:endpoints~WatchEmitter#
     * @description If true then the watch socket has been started
     * @type {boolean}
     */
    Object.defineProperty(this, 'started', { writable: true, value: false });
    /**
     * @name initialState
     * @memberof module:endpoints~WatchEmitter#
     * @description Initial state of the watched API resource
     * @type {KubernetesResource|KubernetesList}
     */
    Object.defineProperty(this, 'initialState', { enumerable: true, value: response });
    /**
     * @name options
     * @memberof module:endpoints~WatchEmitter#
     * @description Request options for the watch socket
     * @type {Object}
     * 
     * @property {object} qs
     * @property {string} qs.resourceVersion - Last known version of the API resource
     */
    Object.defineProperty(this, 'options', { value: Object.clone(options, true) });
    /**
     * @private
     * @name log
     * @memberof module:endpoints~WatchEmitter#
     * @description Bunyan logger for the WatchEmitter
     * @type {bunyan}
     */
    Object.defineProperty(this, 'log', { value: logger.child() });
    this.log.info({resourceVersion: this.options.qs.resourceVersion}, 'created new watch listener');
}
WatchEmitter.prototype = Object.create(EventEmitter.prototype);
WatchEmitter.prototype.constructor = WatchEmitter;
Object.defineProperty(WatchEmitter.prototype, 'toString', { value: function () {
    /** @this {module:endpoints~WatchEmitter} */
    return '[WatchEmitter \'' + this.options.url + '\']';
}});

/**
 * @public
 * @description Initialize the watch socket for the WatchEmitter
 * 
 * Events will not be sent by the WatchEmitter until this method is called. This allows the caller to set up all event
 * listeners without missing any events.
 * 
 * By default the WatchEmitter will always attempt to reconnect automatically whenever a timeout occurs on the watch
 * socket. This behavior can be changed by specifying the desired `retryCount` parameter. If set, the WatchEmitter will
 * only attempt to reconnect a maximum of `retryCount` times.
 * 
 * By default this method will only operate once per WatchEmitter object. Repeated calls will simply return immediately.
 * Set the `force` parameter to `true` to initialize a new watch socket regardless.
 * (WARNING: this may result in multiple events being fired per resource update!)
 * 
 * @param {?number} [retryCount] - Number of times to reconnect (null for infinite)
 * @param {boolean} [force=false] - Start even if already started
 */
WatchEmitter.prototype.start = function (retryCount, force) {
    var self = this;
    if (typeof retryCount !== 'number') retryCount = null;
    if (this.started) {
        if (!force) return;
    } else {
        this.started = true;
    }
    
    // Request a new watch stream
    this.log.debug({resourceVersion: this.options.qs.resourceVersion}, 'watching changes to resources');
    /** @type {EventEmitter} */
    var requestListener = request(this.options);
    
    // Propagate server response to WatchEmitter
    requestListener.on('response', function (response) {
        var error = errors(null, response);
        if (error) {
            self.log.error(error);
            self.emit('error', error);
        }
        /**
         * Response from the API server for the established watch socket
         * @event response
         * @type {object}
         */
        else self.emit('response', response);
    // Catch watch socket errors
    }).on('error', function (error) {
        // [DEFAULT] Try again with unlimited retryCount
        if (retryCount === null && (error.code === 'ESOCKETTIMEDOUT' || error.code === 'ETIMEDOUT')) {
            self.start(null, true);
            
        // Subtract one from retryCount and try again
        } else if (retryCount > 0 && (error.code === 'ESOCKETTIMEDOUT' || error.code === 'ETIMEDOUT')) {
            self.start(--retryCount, true);
            
        // Out of attempts or not a timeout - propagate error as a WatchEmitter 'error' event
        } else {
            self.log.error(error);
            /**
             * Error with the watch socket
             * @event error
             * @type {Error}
             */
            self.emit('error', error);
        }
    });

    // Propagate data events to the WatchEmitter
    var buffer = null;
    requestListener.on('data', function (data) {
        // Merge partial data objects
        if (buffer instanceof Buffer) {
            buffer = Buffer.concat([buffer, data]);
        } else {
            buffer = data;
        }
        try {
            // Emit events for incoming WatchEvent data
            var updateData = JSON.parse(buffer.toString());
            buffer = null;

            switch (updateData.type) {
                case 'ADDED':
                    /**
                     * Resource has been created
                     * @event create
                     * @type {KubernetesResource}
                     */
                    self.emit('create', updateData.object);
                    self.options.qs.resourceVersion = updateData.object.metadata.resourceVersion
                        || self.options.qs.resourceVersion;
                    break;
                case 'MODIFIED':
                    /**
                     * Resource has been modified
                     * @event update
                     * @type {KubernetesResource}
                     */
                    self.emit('update', updateData.object);
                    self.options.qs.resourceVersion = updateData.object.metadata.resourceVersion
                        || self.options.qs.resourceVersion;
                    break;
                case 'DELETED':
                    /**
                     * Resource has been deleted
                     * @event delete
                     * @type {KubernetesResource}
                     */
                    self.emit('delete', updateData.object);
                    self.options.qs.resourceVersion = updateData.object.metadata.resourceVersion
                        || self.options.qs.resourceVersion;
                    break;
                default:
                    self.log.error(error);
                    self.emit('error', updateData.object);
                    return;
            }
            var logObject = { resourceVersion: self.options.qs.resourceVersion };
            logObject[updateData.type.toLowerCase()] = updateData.object.metadata.name;
            self.log.debug(logObject, 'watch event received');
            self.log.trace(updateData, 'update data');
        } catch (error) {
            // Suppress any SyntaxErrors from JSON.parse
            if (! error instanceof SyntaxError) {
                self.log.error(error);
                self.emit('error', error);
            }
        }
    });

    requestListener.on('end', () => {
        self.log.debug('connection timeout, restarting watcher');
        self.started = false;
        self.start();
    });
};

module.exports = WatchEmitter;
