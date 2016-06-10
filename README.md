![banner]

# Cisco Kubernetes Client for Node.js
[![github-icon]][github] [![npm-icon]][npm]

[npm]: https://nodei.co/npm/cisco-kube-client/
[npm-icon]: https://nodei.co/npm/cisco-kube-client.png

[github]: https://github.com/ryclarke/cisco-kube-client
[github-icon]: https://raw.githubusercontent.com/ryclarke/cisco-kube-client/gh-pages/img/github-mark.png

[banner]: https://raw.githubusercontent.com/ryclarke/cisco-kube-client/gh-pages/img/cisco-k8s.png
[docs-page]: http://ryclarke.github.io/cisco-kube-client

A [Node.js] client library for [Kubernetes] and [OpenShift]. This client
allows a Node.js application to easily interface with a Kubernetes or
OpenShift master using the respective [APIs][api-common].

Full technical documentation is provided [here][docs-page].

[Node.js]: https://nodejs.org
[Kubernetes]: http://kubernetes.io
[OpenShift]: https://www.openshift.org

[api-common]: https://docs.openshift.org/latest/rest_api/index.html
[api-k8s]: https://docs.openshift.org/latest/rest_api/kubernetes_v1.html
[api-os]: https://docs.openshift.org/latest/rest_api/openshift_v1.html

## Getting Started

#### Installation
The latest stable version of the client is available from [npm]:

    npm install cisco-kube-client

#### Configuration
The client constructor must be given an object with properties defining
the desired configuration. Information about both required and optional
parameters can be found below.

**Required parameters**

```js
{
    //String:   Hostname of the API server
    host: 'https://localhost:8443'
    
    //String:   Version of the API server   Default: 'v1'
    , version: 'v1'

    //Object:   Credentials sent to the oAuth provider
    , auth: {
        user: '<username>'      //String: Username
        , pass: '<password>'    //String: Password
    }
}
```

**Optional parameters**

```js
{
    //String:   Default client namespace     Default: null
    , namespace: 'default'

    //Number:   Level of log output          Default: 'fatal'
    , loglevel: 'fatal'
    
    //Boolean:  Enable Extensions endpoints  Default: false
    , beta: false
    
    //Boolean:  Enable OpenShift endpoints   Default: false
    , oshift: false

    //Boolean:  Return a client Promise      Default: false
    , usePromise: false

    //Number:   HTTP request timeout in ms   Default: null
    , timeout: 10000

    //String:   Access token for oAuth       Default: null
    , token: null

    //String:   Host protocol                Default: 'https'
    , protocol: 'https'

    //Number:   Host port                    Default: 8443
    , port: 8443

    // Note that 'protocol' and 'port' properties are only checked if
    // the corresponding component is missing from the 'host' property.
}
```

#### Usage Pattern
The Cisco Kubernetes Client utilizes promises from the [bluebird]
Node.js module for asynchronous processing. Promises are the recommended
usage pattern for the Cisco Kubernetes Client. See [here][promises] for
more information on proper promise usage.

The client constructor will return a Promise of the client, which will
resolve when initialization has completed.

Almost all endpoint methods will return promises of the response data.
The only exception to this is the `watch` method, which returns an
EventEmitter object with `data` events instead.

```js
var Client = require('cisco-kube-client');

//Minimum viable configuration example
var options = {
    host: 'localhost'
    , auth: {
        user: 'johndoe'
        , pass: 'password123'
    }
};

Client(options).then(function (client) {
    // Use the client here
    client.<resource>.<method>.then(function (result) {
        // Process the result here
    });
});
```

[bluebird]: https://bluebirdjs.com
[promises]: https://www.promisejs.org/

#### Callback support
The client also has full compatibility with Node.js style callbacks if
you prefer not to use promises in your application.

If the client constructor or any endpoint methods receive a function as
the last parameter, instead of returning a promise that function will
be used as a callback with the promise's value as the second parameter.

```js
var Client = require('cisco-kube-client');

var options = {
    host: 'localhost'
    , version: 'v1'
};

Client(options, function (error, client) {
    // Use the client here
});
```

## Client features
**Structure**

All API resource endpoints are accessed with the following template:

```js
client.<resource>.<method>
```

The accepted parameters and return values for each method are consistent
across all API resource endpoints.

Valid values for `<resource>` and `<method>` are detailed below.

#### Available Kubernetes resources
See the official [API specification][api-k8s] for details.
* `endpoints`
* `events`
* `limitRanges`
* `namespaces`
* `nodes`
* `persistentVolumeClaims`
* `persistentVolumes`
* `podTemplates`
* `pods`
* `replicationControllers`
* `resourceQuotas`
* `secrets`
* `serviceAccounts`
* `services`

### Available Extensions resources
See the official [API specification][api-k8s] for details.
Only available if the client has been configured with `beta: true`

### Available OpenShift resources
See the official [API specification][api-os] for details.
Only available if the client has been configured with `oshift: true`

#### Available methods
**Basic methods**

These expose fundamental API server functionality:

```js
   get ([query], [opts], [callback])
 watch ([query], [opts], [callback])
create (body, [opts], [callback])
update (query, body, [opts], [callback])
 patch (query, body, [opts], [callback])
delete (query, [opts], [callback])
```

The optional `opts` argument is an object containing properties to be
applied to the internal http request. This allows for per-call overrides
of library default functionality. The most common use for this is to
specify request headers and/or query strings. The `namespace` property
is also recognized to override the default namespace filter settings for
the client. Additionally, the `labels` and `fields` properties may
contain labelSelector and fieldSelector options, respectively.

**Watch method**

The `watch` method is unique in that it returns a Promise of a custom
EventEmitter object rather than an API response body. The initial state
of the watched resource is fetched and is available as the
`initialState` property of the emitter object. The watch connection will
not be initialized until the emitter's `start` method is called. This
allows for the user to set up all event listeners without missing any
watch events. The events that will be emitted are `response`, `create`,
`update`, `delete`, and `error`.

```js
// Watch for updates to all resources of type <resource>
client.<resource>.watch().then(function (em) {
    console.log(em.initialState);   // Current state of the resource

    // Set up event listeners
    em.on('create', createHandler);
    em.on('update', updateHandler);
    em.on('delete', deleteHandler);
    
    em.start(); // Start the watch connection with the API server
});
```

[request-streaming]: https://github.com/request/request#streaming

**Nested endpoints**

Some resources have nested resource endpoints available within them.
These are exposed by name under the parent resource. Inspect the client
object for access to the complete list of available methods.

```js
console.log(client);    // Print available resources and methods
```

Nested endpoints may be accessed as shown below. Note that *all* nested
endpoints operate on a single top level resource, so the query parameter
is always required.

```js
//Base endpoint:    client.<resource>.<method>

var podPromise = client.pods.get('<podName>');

//Nested endpoint:  client.<parent>.<resource>.<method>

var podLogPromise = client.pods.logs.get('<podName>');
```

**Compound methods**

In addition to the base functionality offered by the API itself, this
client also implements some methods for batch operations. These methods
are exposed through the `nodes` resource and act on all pods running on
the given node.

```js
   getPods (query, [opts], callback)        // Get all pods
 patchPods (query, body, [opts], callback)  // Patch all pods
deletePods (query, [opts], callback)        // Delete all pods
  evacuate (query, [opts], callback)        // Evacuate a node
```

The `evacuate` method flags the given node as unschedulable via an
internal call to `patch` and removes all pods residing on the given node
via an internal call to `deleteFrom`.

#### Proxy resources

These can be accessed using: `client['proxy/<resource>'].<method>`

Available resources are `nodes`, `pods`, and `services`. These proxy
resources have been implemented based on the Kubernetes API, but they
have not been tested. **USE AT YOUR OWN RISK!**

## Examples
#### Getting from pods
To get all pods:

```js
client.pods.get().then(function (pods) {
    console.log('pods:', pods);
});
```

#### Defining a custom API group

Custom API groups can be defined according to the Kubernetes
specification. These APIS are reached at apis/{name} by default, but
a custom `prefix` parameter can be defined to change this. Nested
endpoints and per-endpoint request options can also be specified.

All endpoints defined in the API specification's `spec` property will
be added to the client's list of available endpoints.

```js
client.defineAPI({
    name: 'apiGroup'
    , spec: {
        endpoints: {
            kind: 'Endpoint'
        }
    }
});
// Adds a property `client.endpoints` -> {host}/apis/apiGroup/endpoints
```

#### Defining a custom resource endpoint

Individual endpoints can also be added on demand. Use the following
method to define a single custom endpoint:

```js
client.createEndpoint('test', spec);
// then use the test resource like any other top level endpoint
```

## Version compatibility
This client is built to interface with version `v1` of the official
Kubernetes and OpenShift APIs. While backward compatibility with older
versions has been attempted, it cannot be guaranteed. No further support
will be offered for API versions that have been deprecated.
