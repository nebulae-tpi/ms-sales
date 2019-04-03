"use strict";

const { of, forkJoin } = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require("rxjs/operators");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const uuidv4 = require("uuid/v4");
const TransactionsDA = require("./data-access/TransactionsDA");
const Crosscutting = require("../../tools/Crosscutting");
const vehicleSubscriptionPricePerWeek = process.env.VEHICLE_SUBS_WEEK_PRICE;
const PRODUCT_DAYS_PACK_MAPPER = { WEEK: 7, DAY: 1 }

/**
 * Singleton instance
 */
let instance;

class PosES {
  constructor() {}

  handleSaleWalletRechargeCommited$({aid, data, user}){
    console.log("handleSaleWalletRechargeCommited$", aid, data);
    return of(data)
    .pipe(
      map(() => ({
        type: 'SALE',
        concept: 'WALLET_RECHARGE',      
        amount: data.amount,
        walletId: data.walletId,
        fromId: data.businessId,
        toId: data.walletId
      })),
      mergeMap(evtData => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "WalletTransactionCommited",
          eventTypeVersion: 1,
          aggregateType: "Wallet",
          aggregateId: uuidv4(),
          data: evtData,
          user: user
        })
      )),
    );
  }

  handleSaleVehicleSubscriptionCommited$({aid, data, user}){
    console.log("handleSaleVehicleSubscriptionCommited$", aid, data);
    return of({})
    .pipe(
      map(() => ({
        _id: Crosscutting.generateHistoricalUuid(),
        type: 'PURCHASE',
        concept: 'VEHICLE_SUBSCRIPTION',      
        amount: vehicleSubscriptionPricePerWeek * data.qty,
        walletId: data.walletId,
        fromId: data.walletId,
        toId: data.businessId
      })),
      // to to something before send Other event 
      mergeMap((tx) => forkJoin(
        eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "WalletTransactionCommited",
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: uuidv4(),
            data: tx,
            user: user
          })
        ),
        eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "Vehicle",
            eventTypeVersion: 1,
            aggregateType: "VehicleSubscriptionPaid",
            aggregateId: uuidv4(),
            data: {
              licensePlate: data.plate,
              packProduct: data.pack,
              quantity: data.qty,
              daysPaid: PRODUCT_DAYS_PACK_MAPPER[data.pack]
            },
            user: user
          })
        ),

      )),
    );
  }
}

/**
 * @returns {PosES}
 */
module.exports = () => {
  if (!instance) {
    instance = new PosES();
    console.log(`${instance.constructor.name} ##################Singleton created`);
  }
  return instance;
};
