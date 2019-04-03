"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const PosDA = require('./data-access/PosDA');
const TransactionsDA = require('./data-access/TransactionsDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,
  PERMISSION_DENIED_ERROR
} = require("../../tools/customError");
const Crosscutting = require("../../tools/Crosscutting");




/**
 * Singleton instance
 */
let instance;

class PosCQRS {
  constructor() {
  }

  salesWalletsByFilter$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesWalletsByFilter",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(() => PosDA.getFilteredWallets$(args.filterText, args.businessId, args.limit) ),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  salesPosReloadBalance$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosReloadBalance",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If a user does not have the role to get info of a wallet from other business, we must return an error
          if (!isPlatformAdmin && authToken.businessId != args.businessId) {
            return this.createCustomError$(
              PERMISSION_DENIED_ERROR,
              'salesPosReloadBalance'
            );
          }
          return of(roles);
      }),      
      map(() => ({
        ...args,
        timestamp: Date.now(),
        _id: Crosscutting.generateHistoricalUuid(),
      })),
      mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "SaleWalletRechargeCommited",
          eventTypeVersion: 1,
          aggregateType: "Sale",
          aggregateId: evtData._id,
          data: evtData,
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Reload Balance was made` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  salesPosPayVehicleSubscription$({ args }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosPayVehicleSubscription",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If a user does not have the role to get info of a wallet from other business, we must return an error
          if (!isPlatformAdmin && authToken.businessId != args.businessId) {
            return this.createCustomError$(
              PERMISSION_DENIED_ERROR,
              'salesPosPayVehicleSubscription'
            );
          }
          return of(roles);
      }),      
      mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "SaleVehicleSubscriptionCommited",
          eventTypeVersion: 1,
          aggregateType: "Sale",
          aggregateId: args.businessId,
          data: args,
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Reload Balance was made` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  salesPosGetLastTransactions$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosGetLastTransactions",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(() => TransactionsDA.getLastTransactions$(args.walletId, args.limit)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }
}

/**
 * @returns {PosCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new PosCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
