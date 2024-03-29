const withFilter = require('graphql-subscriptions').withFilter;
const PubSub = require('graphql-subscriptions').PubSub;
const pubsub = new PubSub();
const { of } = require('rxjs');
const { map, mergeMap, catchError } = require('rxjs/operators');
const broker = require('../../broker/BrokerFactory')();
const RoleValidator = require('../../tools/RoleValidator');
const { CustomError } = require('../../tools/customError');
//Every single error code
// please use the prefix assigned to this microservice
const INTERNAL_SERVER_ERROR_CODE = 19001;
const PERMISSION_DENIED_ERROR_CODE = 19002;
const { handleError$ } = require('../../tools/GraphqlResponseTools');

const CONTEXT_NAME = 'ms-sales';

function getResponseFromBackEnd$(response) {
  return of(response).pipe(
    map(resp => {
      if (resp.result.code != 200) {
        const err = new Error();
        err.name = 'Error';
        err.message = resp.result.error;
        // this[Symbol()] = resp.result.error;
        Error.captureStackTrace(err, 'Error');
        throw err;
      }
      return resp.data;
    })
  );
}





module.exports = {
  //// QUERY ///////  
  Query: {
    SalesPosProductPrices(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles, CONTEXT_NAME,
        'SalesPosProductPrices', PERMISSION_DENIED_ERROR_CODE,
        'Permission denied', ['DRIVER']
      )
        .pipe(
          mergeMap(() => broker.forwardAndGetReply$(
            "Pos", "drivergateway.graphql.query.salesPosProductPrices",
            { root, args, jwt: context.encodedToken }, 2000
          )),
          catchError(err => handleError$(err, "SalesPosProductPrices_DriverApp")),
          mergeMap(response => getResponseFromBackEnd$(response))
        )
        .toPromise();
    }
  },
  Mutation:{ 
    
    SalesPosPayVehicleSubscription(root, args, context) {
      return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles, 'ms-Sales', 'SalesPosPayVehicleSubscription',
          PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["DRIVER"]).pipe(
            mergeMap(() =>
                context.broker.forwardAndGetReply$(
                    "Pos",
                    "drivergateway.graphql.mutation.salesPosPayVehicleSubscription",
                    { root, args, jwt: context.encodedToken },
                    10000
                )
            ),
            catchError(err => handleError$(err, "SalesPosPayVehicleSubscription_DriverApp")),
            mergeMap(response => getResponseFromBackEnd$(response))
          )
          .toPromise();
    }
  }
};

