'use strict';
require('sugar');

/**
 * @private
 * @name Error
 * @property {function} captureStackTrace
 */

/**
 * @name call
 * @public
 * @function
 * @memberof module:errors
 * @description Parse a response from the API server to determine error status
 *
 * @param {?Error} error
 * @param {?object} response
 * @returns {?Error|module:errors.HttpError}
 */
/**
 * @module errors
 * @description x
 * 
 * @returns {?Error|module:errors.HttpError}
 */
module.exports = function GetError(error, response) {
    if (error instanceof Error) {
        return error;
    } else if (response.statusCode > 399) {
        if (http.hasOwnProperty(response.statusCode)) {
            return new http[response.statusCode](response.body);
        } else {
            return new HttpError(response.body, response.statusCode);
        }
    } else if (response.body && response.body.statusCode > 399) {
        if (http.hasOwnProperty(response.body.statusCode)) {
            return new http[response.body.statusCode](response.body);
        } else {
            return new HttpError(response.body, response.body.statusCode);
        }
    } else return null;
};
module.exports.HttpError = HttpError;
/**
 * @name throw
 * @public
 * @function
 * @memberof module:errors
 * @description Send the given error to the log, then throw it
 * @param {bunyan} log - Log stream for error reporting
 * @param {Error} error - Error to log and throw
 * @param {?object} [values] - Addiitonal properties to add to the error
 * @param {?string} [message] - Additional log message
 * 
 * @throws {Error}
 */
module.exports.throw = function (log, error, values, message) {
    (values || {}).keys(function (key, value) {
        error[key] = value;
    });
    log(error, message);
    throw error;
};

/**
 * @class
 * @inner
 * @memberof module:errors
 * @description Base class for client errors
 * 
 * @extends Error
 */
function ClientError(message, statusCode) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    Object.defineProperty(this, 'name', { value: this.constructor.name });
    /**
     * Description of the error
     * @type {string}
     */
    this.message = message;
    if (statusCode) {
        /**
         * HTTP status code
         * @type {number}
         */
        this.statusCode = statusCode;
    }
}
ClientError.prototype = Object.create(Error.prototype);
ClientError.prototype.constructor = ClientError;
module.exports.ClientError = ClientError;

/**
 * @class
 * @static
 * @memberof module:errors
 * @description Missing initialization parameter
 * 
 * @extends module:errors~ClientError
 * 
 * @param {string|object} parameter - Missing config parameter name
 */
function ParameterError(parameter) {
    ClientError.call(this, 'missing required parameter: \'' + parameter + '\'');
}
ParameterError.prototype = Object.create(ClientError.prototype);
ParameterError.prototype.constructor = ParameterError;
module.exports.ParameterError = ParameterError;

/**
 * @class
 * @static
 * @memberof module:errors
 * @description Invalid API version
 *
 * @extends module:errors~ClientError
 * 
 * @param {string} version - Requested API version
 * @param {object.<APISpecification>} spec - API versions specification
 */
function VersionError(version, spec) {
    ClientError.call(this, 'invalid api version: \'' + version + '\'');
    /**
     * @name versions
     * @memberof module:errors.VersionError
     * @description List of valid versions for the given API
     * @type {string[]}
     */
    Object.defineProperty(this, 'versions', {enumerable: true, value: Object.keys(spec)});
}
VersionError.prototype = Object.create(ClientError.prototype);
VersionError.prototype.constructor = VersionError;
module.exports.VersionError = VersionError;

/**
 * @class
 * @static
 * @memberof module:errors
 * @description Parsing of the oAuth token failed
 * 
 * @extends {module:errors~ClientError}
 * 
 * @param {?string} header - Response header that was parsed
 * @param {Error} error - The original error
 */
function TokenParseError(header, error) {
    ClientError.call(this, 'failed to parse oAuth token from response');
    /**
     * The response header that was parsed
     * @type {string}
     */
    this.header = header;
    /**
     * The original error
     * @type {Error}
     */
    this.error = error;
}
TokenParseError.prototype = Object.create(ClientError.prototype);
TokenParseError.prototype.constructor = TokenParseError;
module.exports.TokenParseError = TokenParseError;

/**
 * @class
 * @static
 * @memberof module:errors
 * @description HTTP Request Errors
 */
function HttpError(message, code) {
    ClientError.call(this, message, code);
}
HttpError.prototype = Object.create(ClientError.prototype);
HttpError.prototype.constructor = HttpError;

var http = {
    400: function BadRequestError(message) {
        HttpError.call(this, message, 400);
    },
    401: function UnauthorizedError(message) {
        HttpError.call(this, message, 401);
    },
    403: function ForbiddenError(message) {
        HttpError.call(this, message, 403);
    },
    404: function NotFoundError(message) {
        HttpError.call(this, message, 404);
    }
};
for (var i in http) {
    if (http.hasOwnProperty(i)) http[i].prototype = Object.create(HttpError.prototype);
    if (http.hasOwnProperty(i)) http[i].prototype.constructor = http[i];
}
