"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const PosDA = require('./data-access/WalletDA');
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
    // console.log("salesPosReloadBalance$", args);
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
        _id: uuidv4(), type: 'Reload', notes: '',
        concept: 'Pos Reload', timestamp: Date.now(),      
        amount: args.amount,
        fromId: args.businessId,
        toId: args.walletId
      })),
      mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "SaleWalletRechargeCommited",
          eventTypeVersion: 1,
          aggregateType: "Sale",
          aggregateId: uuidv4(),
          data: evtData,
          user: authToken.preferred_username
        })
      )),
      // mergeMap(evt => broker.send$(
      //   MATERIALIZED_VIEW_TOPIC, 'WalletsUpdateReported',
      //   { _id: "5c9a6ab8feb3ae0bb6ddfb97", pockets: { main: Math.floor(Math.random() * 10000) } })
      // ),
      // map(() => ({
      //   _id: uuidv4(), type: 'Reload', notes: '',
      //   concept: 'Pos Reload', timestamp: Date.now(),      
      //   amount: args.amount,
      //   fromId: args.businessId,
      //   toId: args.walletId
      // })),
      // mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
      //   new Event({
      //     eventType: "WalletTransactionCommited",
      //     eventTypeVersion: 1,
      //     aggregateType: "Wallet",
      //     aggregateId: args.businessId,
      //     data: evtData,
      //     user: authToken.preferred_username
      //   })
      // )),
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
      // map(() => ({
      //   _id: uuidv4(), type: 'Reload', notes: '',
      //   concept: 'Pos Reload', timestamp: Date.now(),      
      //   amount: args.amount,
      //   fromId: args.businessId,
      //   toId: args.walletId
      // })),
      // mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
      //   new Event({
      //     eventType: "WalletTransactionCommited",
      //     eventTypeVersion: 1,
      //     aggregateType: "Wallet",
      //     aggregateId: args.businessId,
      //     data: evtData,
      //     user: authToken.preferred_username
      //   })
      // )),
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
