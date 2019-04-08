"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval, throwError, forkJoin} = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const PosDA = require('./data-access/PosDA');
const VehicleDA = require('./data-access/VehicleDA');

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
  PERMISSION_DENIED_ERROR,
  INSUFFICIENT_BALANCE,
  VEHICLE_NO_FOUND,
  VEHICLE_IS_INACTIVE,
  VEHICLE_FROM_OTHER_BU
} = require("../../tools/customError");
const Crosscutting = require("../../tools/Crosscutting");
const vehicleSubscriptionPricePerWeek = process.env.VEHICLE_SUBS_WEEK_PRICE;
const VehicleSubscriptionPrices = process.env.VEHICLE_SUBS_PRICES || { day: 0, week: 12000, month: 40000 }




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
    console.log("salesPosPayVehicleSubscription$", args);
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
      mergeMap(() => PosDA.getWalletById$(args.walletId)),
      // VALIDATIONS
      mergeMap(wallet => {
        return (wallet && wallet.pockets && wallet.pockets.main && (wallet.pockets.main < vehicleSubscriptionPricePerWeek * args.qty))
          ? this.createCustomError$(INSUFFICIENT_BALANCE, 'salesPosPayVehicleSubscription')
          : forkJoin(VehicleDA.findByLicensePlate$(args.plate), of(wallet))
      }),
      mergeMap(([v, w]) =>  {
        console.log("WALLET", w, "VEHICLE", v);
        if(!v){
          return this.createCustomError$(VEHICLE_NO_FOUND, "salesPosVehicleExist");
        } else if (v && !v.active){
          return this.createCustomError$(VEHICLE_IS_INACTIVE, "salesPosVehicleExist")
        }else if(v.businessId != w.businessId){
          return this.createCustomError$(VEHICLE_FROM_OTHER_BU, "salesPosVehicleExist")
        }
        else{
          return of({})
        }
      }),
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "SaleVehicleSubscriptionCommited",
          eventTypeVersion: 1,
          aggregateType: "Sale",
          aggregateId: uuidv4(),
          data: args,
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Reload Balance was made` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  getSalesPosProductPrices$({ args }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosPayVehicleSubscription",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(() => of(VehicleSubscriptionPrices)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  salesPosBalanceWithdraw$({ args }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosPayVehicleSubscription",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS"]
    ).pipe(
      mergeMap(() => PosDA.getWalletById$(args.walletId)),
      mergeMap(wallet => {
        return (wallet && wallet.pockets && wallet.pockets.main && (wallet.pockets.main < args.amount))
          ? this.createCustomError$(INSUFFICIENT_BALANCE, 'salesPosPayVehicleSubscription')
          : of({}) 
      }),
      mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "SalesPosWithdrawalCommitted",
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

  /**
   * Creates a custom error observable
   * @param {*} error Error
   * @param {*} methodError Method where the error was generated
   */
  createCustomError$(error, methodError) {
    return throwError(
      new CustomError("POS CQRS", methodError || "", error.code, error.description )
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
