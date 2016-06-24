/**
 * @name Object.keys
 * @description Modified method signature from Sugar.js
 * @function
 * @private
 * @param {object}
 * @param {function=}
 */

/**
 * @global
 * @typedef {object} KubernetesItem
 * @description Entry in a KubernetesList
 *
 * @property {object} metadata - Object metadata
 * @property {object} spec - Desired object specification
 */

/**
 * @global
 * @typedef {object} KubernetesResource
 * @description Kubernetes resource object
 *
 * @property {string} kind - Kubernetes API resource name
 * @property {string} apiVersion - Reference API version
 * @borrows metadata from KubernetesItem
 * @borrows spec from KubernetesItem
 */

/**
 * @global
 * @typedef {object} KubernetesList
 * @description List of Kubernetes resource objects
 *
 * @property {KubernetesItem[]} items
 * @borrows kind from KubernetesResource
 * @borrows apiVersion from KubernetesResource
 * @borrows metadata from KubernetesItem
 */

/**
 * @global
 * @typedef {object} EndpointSpecification
 * @description Specification of an API resource endpoint
 * 
 * @property {string} kind - Kubernetes API resource name
 * @property {string} [nickname] - Shortened endpoint name
 * @property {NestedResourceDefinition[]} [nested] - List of nested resources
 * @property {object} [options] - Request overrides for the endpoint
 * @property {boolean} [options.ns=true] - Whether the endpoint uses namespaces
 * @property {string[]} [options.methods] - List of valid base methods
 */

/**
 * @global
 * @typedef {object} APISpecification
 * @description Specification of an API group
 * 
 * @property {string} name - Name of the API group
 * @property {string} [prefix] - Custom URL prefix for endpoints
 * @property {object.<EndpointSpecification>} spec - Specification of all resource endpoints
 */

/**
 * @global
 * @typedef {object} NestedResourceDefinition
 * @description Specification of nested API resource endpoints
 *
 * @property {string[]} methods - List of valid methods
 * @property {string} resource - Nested resource name
 */

/**
 * @namespace api
 * @description Specification of the base Kubernetes API
 *
 * All endpoints are defined as instance members of the [KubernetesClient]{@link module:client.KubernetesClient}. The
 * constructor for the client parses each {@link EndpointSpecification} defined for the chosen API version to create
 * the appropriate Endpoint object for the client. The specified `version` parameter for the client must match one of
 * the values defined here.
 * 
 * @see http://kubernetes.io/docs/api/
 * @type {object.<APISpecification>}
 */
const KubernetesSpecification = {
    /**
     * Stable version `v1` of the base Kubernetes API
     * @namespace api.v1
     * @type {APISpecification}
     * @see http://kubernetes.io/docs/api-reference/v1/operations/
     */
    v1: {
        name: 'v1'
        , spec: {
            /**
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            bindings: {
                kind: 'Binding'
                , options: {methods: ['create']}
            },
            /**
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            componentStatuses: {
                kind: 'ComponentStatus'
                , options: {ns: false, methods: ['get', 'watch']}
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/services/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            endpoints: {kind: 'Endpoint'},
            /**
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            events: {kind: 'Event'},
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/admin/limitrange/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            limitRanges: {kind: 'LimitRange'},
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/namespaces/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            namespaces: {
                kind: 'Namespace'
                , nickname: 'ns'
                , options: {ns: false}
                , nested: [
                    {resource: 'finalize', methods: ['update']}
                ]
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/admin/node/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            nodes: {
                kind: 'Node'
                , options: {ns: false}
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/volumes/
             * @see http://kubernetes.io/docs/user-guide/persistent-volumes/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            persistentVolumes: {
                kind: 'PersistentVolume'
                , nickname: 'pv'
                , options: {ns: false}
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/volumes/
             * @see http://kubernetes.io/docs/user-guide/persistent-volumes/#persistentvolumeclaims
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            persistentVolumeClaims: {
                kind: 'PersistentVolumeClaim'
                , nickname: 'pvc'
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/pods/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            pods: {
                kind: 'Pod'
                , nested: [
                    {resource: 'attach', methods: ['get', 'create']}
                    , {resource: 'binding', methods: ['get']}
                    , {resource: 'exec', methods: ['get', 'create']}
                    , {resource: 'log', methods: ['get']}
                    , {resource: 'portforward', methods: ['get', 'create']}
                    , {resource: 'proxy'}
                ]
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/replication-controller/#pod-template
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            podTemplates: {kind: 'PodTemplate'},
            /**
             * @private
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            'proxy/nodes': {kind: 'Proxy'},
            /**
             * @private
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            'proxy/pods': {kind: 'Proxy'},
            /**
             * @private
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            'proxy/services': {kind: 'Proxy'},
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/replication-controller/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            replicationControllers: {
                kind: 'ReplicationController'
                , nickname: 'rc'
            },
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/admin/resourcequota/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            resourceQuotas: {kind: 'ResourceQuota'},
            /**
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            secrets: {kind: 'Secret'},
            /**
             * @memberof api.v1#
             * @see http://kubernetes.io/docs/user-guide/services/
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            services: {
                kind: 'Service'
                , nickname: 'svc'
            },
            /**
             * @memberof api.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            serviceAccounts: {kind: 'ServiceAccount'}
        }
    }
};

/**
 * @namespace apis
 * @description Specification of the Kubernetes API groups
 * 
 * API groups allow for easy expansion of the base Kubernetes API while maintaining compatibility with the main
 * resource endpoints. This library comes prepackaged with the `extensions` API group from Kubernetes, available by
 * setting the `beta` configuration property to the desired extensions version, or `true` for the latest available
 * version. Below is an example for defining API groups for the client. Specify additional {@link APISpecification}
 * objects in the `apis` configuration property to add custom API groups to the client.
 * 
 * @example config.apis = [{
 *     // Define name in the format: {API_GROUP}/{VERSION}
 *     name: 'fruits/v1'
 *     , spec: {
 *         // `apples` endpoint for resource of kind `Apple`
 *         apples: {
 *             kind: 'Apple'
 *             // Example of nested resource endpoint definitions
 *             , nested: [{
 *                 resource: 'peel'
 *                 , methods: ['get', 'put']    // Defines `client.apples.getPeel` and `client.apples.putPeel` methods
 *             }, {
 *                 resource: 'juice'
 *                 , methods: ['get']   // Defines `client.oranges.getJuice` method
 *             }]
 *         },
 *         // `oranges` endpoint for resources of kind `Orange`
 *         oranges: {
 *             kind: 'Orange'
 *             , nickname: 'oj' // Creates link to resource `client.oj === client.oranges`
 *         }
 *     }
 * }];
 */
/**
 * @namespace apis.extensions
 * @description Specification of the Kubernetes API group `extensions`
 *
 * Set the `beta` configuration property to enable these endpoints. If no version is given (i.e. `beta === true`) then
 * the latest defined version will be used.
 * 
 * If enabled, all endpoints are defined as [Endpoint]{@link module:endpoints~Endpoint} instance members of the
 * [KubernetesClient]{@link module:client.KubernetesClient} object.
 *
 * @type {object.<APISpecification>}
 */
const KubernetesExtensionsSpecification = {
    /**
     * Beta version `v1beta1` of the Kubernetes Extensions API
     * @namespace apis.extensions.v1beta1
     * @type {APISpecification}
     * @see http://kubernetes.io/docs/api-reference/extensions/v1beta1/operations/
     */
    v1beta1: {
        name: 'extensions/v1beta1'
        , spec: {
            /**
             * @memberof apis.extensions.v1beta1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            daemonSets:{kind: 'DaemonSet'},
            /**
             * @memberof apis.extensions.v1beta1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            deployments: {kind: 'Deployment'},
            /**
             * @memberof apis.extensions.v1beta1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            horizontalPodAutoscalers: {kind: 'HorizontalPodAutoscaler'},
            /**
             * @memberof apis.extensions.v1beta1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            ingresses: {kind: 'Ingress'},
            /**
             * @memberof apis.extensions.v1beta1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            jobs: {kind: 'Job'}
        }
    }
};

/**
 * @namespace oapi
 * @description Specification of the base OpenShift API
 *
 * Set the `oshift` configuration property to enable these endpoints. If no version is given (i.e. `oshift === true`)
 * then the version will match the Kubernetes API version.
 * 
 * If enabled, all endpoints are defined as [Endpoint]{@link module:endpoints~Endpoint} instance members of the
 * [KubernetesClient]{@link module:client.KubernetesClient} object.
 * 
 * @type {object.<APISpecification>}
 */
const OpenShiftSpecification = {
    /**
     * Stable version `v1` of the base OpenShift API
     * @namespace oapi.v1
     * @type {APISpecification}
     */
    v1: {
        name: 'v1'
        , prefix: 'oapi'
        , spec: {
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            builds: {
                kind: 'Binding'
                , nested: [
                    {resource: 'clone', methods: ['create']}
                    , {resource: 'log', methods: ['get']}
                ]
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            buildConfigs: {
                kind: 'BuildConfig'
                , nested: [
                    {resource: 'instantiate', methods: ['create']}
                    , {resource: 'webhooks', methods: ['create']}
                ]
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            clusterNetworks: {
                kind: 'ClusterNetwork'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            clusterPolicies: {
                kind: 'ClusterPolicy'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            clusterPolicyBindings: {
                kind: 'ClusterPolicyBinding'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            clusterRoles: {
                kind: 'ClusterRole'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            clusterRoleBindings: {
                kind: 'ClusterRoleBinding'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            deploymentConfigs: {kind: 'DeploymentConfig'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            deploymentConfigRollbacks: {kind: 'DeploymentConfigRollback'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            generatedDeploymentConfigs: {
                kind: 'GeneratedDeploymentConfig'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            groups: {
                kind: 'Group'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            hostSubnets: {
                kind: 'HostSubnet'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            identities: {
                kind: 'Identity'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            images: {
                kind: 'Image'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            imageStreams: {kind: 'ImageStream'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            imageStreamImages: {kind: 'ImageStreamImage'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            imageStreamMappings: {kind: 'ImageStreamMapping'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            imageStreamTags: {kind: 'ImageStreamTag'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            localResourceAccessReviews: {kind: 'LocalResourceAccessReview'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            localSubjectAccessReviews: {kind: 'LocalSubjectAccessReview'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            netNamespaces: {
                kind: 'NetNamespace'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            oAuthAccessTokens: {
                kind: 'oAuthAccessToken'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            oAuthAuthorizeTokens: {
                kind: 'oAuthAuthorizeToken'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            oAuthClients: {
                kind: 'oAuthClient'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            oAuthClientAuthorizations: {
                kind: 'oAuthClientAuthorization'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            policies: {kind: 'Policy'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            policyBindings: {kind: 'PolicyBinding'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            processedTemplates: {kind: 'ProcessedTemplate'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            projects: {
                kind: 'Project'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            projectRequests: {
                kind: 'ProjectRequest'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            remoteAccessReviews: {
                kind: 'RemoteAccessReview'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            resourceAccessReviews: {kind: 'ResourceAccessReview'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            roles: {kind: 'Role'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            roleBindings: {kind: 'RoleBinding'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            routes: {kind: 'Route'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            subjectAccessReviews: {kind: 'SubjectAccessReview'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            templates: {kind: 'Template'},
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            users: {
                kind: 'User'
                , options: {ns: false}
            },
            /**
             * @memberof oapi.v1#
             * @type {module:endpoints~Endpoint|EndpointSpecification}
             */
            userIdentityMappings: {
                kind: 'UserIdentityMapping'
                , options: {ns: false}
            }
        }
    }
};

module.exports = {
    Kubernetes: KubernetesSpecification,
    KubernetesExtensions: KubernetesExtensionsSpecification,
    OpenShift: OpenShiftSpecification
};
