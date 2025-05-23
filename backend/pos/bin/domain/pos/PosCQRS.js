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
  BUSINESS_HAVE_NOT_PRICES_CONF,
  BUSINESS_ID_MISSING_ON_TOKEN,
  DRIVER_ID_MISSING_ON_TOKEN,
  VEHICLE_IS_INACTIVE,
  VEHICLE_FROM_OTHER_BU,
  TRANSACTION_DUPLICATED
} = require("../../tools/customError");
const Crosscutting = require("../../tools/Crosscutting");
const VehicleSubscriptionPrices = JSON.parse(process.env.VEHICLE_SUBS_PRICES) || { 
  // TX-PLUS-CALI
  "75cafa6d-0f27-44be-aa27-c2c82807742d": {day: "2200", week: "13200", fortnigth: "22000", month: "53000"},
  // TX-PLUS-MANIZALES
  "b19c067e-57b4-468f-b970-d0101a31cacb": {day: "2200", week: "13200", fortnigth: "20000", month: "53000"},
  // NEBULAE
  "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab": {day: "2200", week: "13200", fortnigth: "20000", month: "53000"},
  // nebulae-development
  "4ab03a09-9e34-40fe-9102-25cc6b5b2176": {day: "2200", week: "13200", fortnigth: "20000", month: "53000"},
  // free driver
  "2af56175-227e-40e7-97ab-84e8fa9e12ce": {day: "2200", week: "13200", fortnigth: "20000", month: "53000"}
  } 
   
/**
 * Singleton instance
 */
let instance;

const posTransactionsHistoryList = [];
const TRANSACTION_THRESHOLD = 10000; 

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
    //console.log("ENTRA RECARGA ===> ", args)
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
    //console.log("salesPosPayVehicleSubscription$", args);
    const { businessId, pack, qty, walletId } = args;

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
          if (!isPlatformAdmin && authToken.businessId != businessId) {
            return this.createCustomError$(
              PERMISSION_DENIED_ERROR,
              'salesPosPayVehicleSubscription'
            );
          }
          if(  !VehicleSubscriptionPrices[businessId] || !VehicleSubscriptionPrices[businessId][pack.toLowerCase()] ){
            return this.createCustomError$(BUSINESS_HAVE_NOT_PRICES_CONF, "PricesConfigurationNoFound");
          }
          return of(roles);
      }),
      mergeMap(() => { 
        const cacheTransactionIndex = posTransactionsHistoryList.findIndex(p => p.businessId === businessId && p.pack === pack && p.walletId === walletId)
        if (cacheTransactionIndex !== -1 && (posTransactionsHistoryList[cacheTransactionIndex].timestamp + TRANSACTION_THRESHOLD) > Date.now()) {
          return this.createCustomError$(TRANSACTION_DUPLICATED, "TransactionDuplicated");
        } else { 
          return of({}).pipe(
            tap(() => { 
              if (cacheTransactionIndex !== -1) {
                posTransactionsHistoryList.splice(cacheTransactionIndex, 1);
              }
              posTransactionsHistoryList.unshift({businessId, pack, walletId, timestamp: Date.now()})

              if (posTransactionsHistoryList.length > 50) { 
                posTransactionsHistoryList.slice(0, 51);
              }
            })
          )
        }
      }),
      mergeMap(() => PosDA.getWalletById$(args.walletId)),
      // VALIDATIONS
      mergeMap(wallet => {
        const amount = parseInt( VehicleSubscriptionPrices[businessId][pack.toLowerCase()] * qty);
        return (((wallet || {}).pockets || {}).main < amount )
          ? this.createCustomError$(INSUFFICIENT_BALANCE, 'salesPosPayVehicleSubscription')
          : forkJoin(VehicleDA.findByLicensePlate$(args.plate), of(wallet))
      }),
      mergeMap(([v, w]) =>  {
        // console.log("WALLET", w, "VEHICLE", v);
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
          aggregateId: walletId,
          data: args,
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Reload Balance was made` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  salesPosPayVehicleSubscriptionForDriver$({ args }, authToken){
    console.log(`${new Date().toLocaleString()} -- [DRIVER] salesPosPayVehicleSubscriptionForDriver, ARGS: ${JSON.stringify(args)}`);
    
    const { pack, qty, plate } = args;
    console.log(JSON.stringify(authToken));
    const driverWalletId = authToken.driverId;
    const driverBusinessId = authToken.businessId;
    console.log({ driverBusinessId, driverWalletId });

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Sales",
      "salesPosPayVehicleSubscription", PERMISSION_DENIED,
      ["DRIVER"]
    ).pipe(
      mergeMap(() => {
        if(!driverBusinessId){
          return this.createCustomError$(BUSINESS_ID_MISSING_ON_TOKEN, "BusinessIdMisingOnToken");
        }
        if(!driverWalletId){
          this.createCustomError$(DRIVER_ID_MISSING_ON_TOKEN, "DriverIdMisingOnToken");
        }
    
        if( !VehicleSubscriptionPrices[driverBusinessId] || !VehicleSubscriptionPrices[driverBusinessId][pack.toLowerCase()]){
          console.log(`${new Date().toLocaleString()} -- [ERROR] -- Prices conf not found for BU: ${driverBusinessId}`);
          return this.createCustomError$(BUSINESS_HAVE_NOT_PRICES_CONF, "PricesConfigurationNoFound");
        }
        return of({});
      }),
      mergeMap(() => { 
        const cacheTransactionIndex = posTransactionsHistoryList.findIndex(p => p.businessId === driverBusinessId && p.pack === pack && p.walletId === driverWalletId)
        if (cacheTransactionIndex !== -1 && (posTransactionsHistoryList[cacheTransactionIndex].timestamp + TRANSACTION_THRESHOLD) > Date.now()) {
          return this.createCustomError$(TRANSACTION_DUPLICATED, "TransactionDuplicated"); 
        } else { 
          return of({}).pipe(
            tap(() => { 
              if (cacheTransactionIndex !== -1) {
                posTransactionsHistoryList.splice(cacheTransactionIndex, 1);
              }
              posTransactionsHistoryList.unshift({businessId: driverBusinessId, pack, walletId: driverWalletId, timestamp: Date.now()})
              if (posTransactionsHistoryList.length > 50) { 
                posTransactionsHistoryList.slice(0, 51);
              }
            })
          )
        }
      }),
      mergeMap(() => PosDA.getWalletById$(driverWalletId)),
      // VALIDATIONS
      mergeMap(wallet => {
        const amount = parseInt( VehicleSubscriptionPrices[driverBusinessId][pack.toLowerCase()] * qty);
        if((wallet && wallet.pockets && wallet.pockets.main != null && (wallet.pockets.main < amount ))){
          return this.createCustomError$(INSUFFICIENT_BALANCE, 'salesPosPayVehicleSubscription');
        }else {
          return forkJoin([VehicleDA.findByLicensePlate$(plate), of(wallet)])
        }
      }),
      mergeMap(([v, w]) =>  {
        // console.log("WALLET", w, "VEHICLE", v);
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
          aggregateId: driverWalletId,
          data: {
            pack, qty, plate,
            walletId: driverWalletId, 
            businessId: driverBusinessId
          },
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Reload Balance was made` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  getSalesPosProductPrices$({ args }, authToken){
    const { businessId } = args;
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Sales",
      "salesPosPayVehicleSubscription", PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS", "DRIVER"]
    ).pipe(
      mergeMap(() => of(VehicleSubscriptionPrices[businessId])),
      map(prices => {
        prices = prices || {day: "2200", week: "13200", fortnigth: "22000", month: "53000"};
        return Object.keys(prices).reduce((acc, key) => {
          acc[key] = parseInt(prices[key]);
          return acc;
        }, {});
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      //catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  salesPosBalanceWithdraw$({ args }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Sales",
      "salesPosPayVehicleSubscription",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "POS" ]
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
