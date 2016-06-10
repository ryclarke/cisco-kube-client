var test = require('./test')
    , spec = require('../lib/spec')
    , config = require('../config');

Object.keys(spec.OpenShift, function (resource) {
    test(resource, Object.merge({oshift:true}, config, true, false));
});
