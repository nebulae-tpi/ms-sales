const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const { ApolloError } = require("apollo-server");
const { of } = require("rxjs");
const { map, mergeMap, catchError } = require('rxjs/operators');
const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');
const {handleError$} = require('../../tools/GraphqlResponseTools');

const INTERNAL_SERVER_ERROR_CODE = 1;
const PERMISSION_DENIED_ERROR_CODE = 2;

function getResponseFromBackEnd$(response) {
    return of(response)
    .pipe(
        map(({result, data}) => {            
            if (result.code != 200) {
                throw new ApolloError(result.error.msg, result.code, result.error );
            }
            return data;
        })
    );
}

module.exports = {
    //// QUERY ///////
    Query: {
        salesWalletsByFilter(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Sales', 'SalesWalletsByFilter',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
                )
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "Pos",
                        "emigateway.graphql.query.salesWalletsByFilter",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "salesWalletsByFilter")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        SalesPosProductPrices(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Sales', 'SalesPosProductPrices',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
                )
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "Pos",
                        "emigateway.graphql.query.salesPosProductPrices",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "SalesPosProductPrices")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        }        
    },
    //// MUTATIONS ///////
    Mutation: {
        SalesPosReloadBalance(root, args, context) {
            // console.log("ServiceAssignVehicleToDriver", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Sales', 'SalesPosReloadBalance',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
                )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Pos",
                            "emigateway.graphql.mutation.salesPosReloadBalance",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "SalesPosReloadBalance")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                )
                .toPromise();
        },
        SalesPosPayVehicleSubscription(root, args, context) {
            // console.log("ServiceAssignVehicleToDriver", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Sales', 'SalesPosPayVehicleSubscription',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
                )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Pos",
                            "emigateway.graphql.mutation.salesPosPayVehicleSubscription",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "SalesPosPayVehicleSubscription")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                )
                .toPromise();
        },
        SalesPosBalanceWithdraw(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Sales', 'SalesPosBalanceWithdraw',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
                )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Pos",
                            "emigateway.graphql.mutation.salesPosBalanceWithdraw",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "SalesPosBalanceWithdraw")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                )
                .toPromise();
        }
    },
    //// SUBSCRIPTIONS ///////
    Subscription: {
        SalesPoswalletsUpdates: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("SalesPoswalletsUpdates");
                },
                // FILTER
                (payload, variables, context, info) => {
                    return payload.SalesPoswalletsUpdates._id == variables.walletId;
                }
            )
        }
    }
};

//// SUBSCRIPTIONS SOURCES ////
const eventDescriptors = [
    {
        backendEventName: 'WalletsUpdateReported',
        gqlSubscriptionName: 'SalesPoswalletsUpdates',
    },
];


/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker
        .getMaterializedViewsUpdates$([descriptor.backendEventName])
        .subscribe(
            evt => {
                if (descriptor.onEvent) {
                    descriptor.onEvent(evt, descriptor);
                }
                const payload = {};
                payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
                pubsub.publish(descriptor.gqlSubscriptionName, payload);
            },
            error => {
                if (descriptor.onError) {
                    descriptor.onError(error, descriptor);
                }
                console.error(
                    `Error listening ${descriptor.gqlSubscriptionName}`,
                    error
                );
            },
            () => console.log(`${descriptor.gqlSubscriptionName} listener STOPED`)
        );
});
