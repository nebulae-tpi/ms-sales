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
const PRODUCT_DAYS_PACK_MAPPER = { WEEK: 7, DAY: 1, MONTH: 30, FORTNIGTH: 15 };
const VehicleSubscriptionPrices = JSON.parse(process.env.VEHICLE_SUBS_PRICES) || { 
  // TX-PLUS-CALI
  "75cafa6d-0f27-44be-aa27-c2c82807742d": {day: "2000", week: "12000", month: "40000"},
  // TX-PLUS-MANIZALES
  "b19c067e-57b4-468f-b970-d0101a31cacb": {day: "2000", week: "12000", month: "40000"},
  // NEBULAE
  "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab": {day: "2000", week: "12000", month: "40000"},
  // nebulae-development
  "4ab03a09-9e34-40fe-9102-25cc6b5b2176": { day: "2000", week: "12000", month: "40000" },
  // TU-TAXI
  "165e291d-5135-4674-aa25-a157933b2784": { day: "1500", week: "10500", month: "45000", fortnigth: "25000" }
  }
/**
 * Singleton instance
 */
let instance;
const posTransactionsHistoryList = [];
const TRANSACTION_THRESHOLD = 5000; 

class PosES {
  constructor() {}

  handleSaleWalletRechargeCommited$({aid, data, user}){
    const { businessId, amount, walletId  } = data;
    return of(data).pipe(
      map(() => ({
        type: 'MOVEMENT', concept: 'WALLET_RECHARGE',
        businessId, amount,
        fromId: businessId,
        toId: walletId
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
    const { businessId, pack, qty, walletId, plate } = data;
    const amount = parseInt(VehicleSubscriptionPrices[businessId][pack.toLowerCase()]) * qty;
    const cacheTransactionIndex = posTransactionsHistoryList.findIndex(p => p.businessId === businessId && p.pack === pack && p.walletId === walletId);
    if(businessId === "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab"){
      if (cacheTransactionIndex !== -1 && (posTransactionsHistoryList[cacheTransactionIndex].timestamp + TRANSACTION_THRESHOLD) > Date.now()) {
        return of({}).pipe(
          tap(() => {
            console.log("TRANSACTION DUPLICATED ===> ", data);
          })
        )
      } else { 
        return of({}).pipe(
          tap(() => { 
            if (cacheTransactionIndex !== -1) {
              posTransactionsHistoryList.splice(cacheTransactionIndex, 1);
            }
            posTransactionsHistoryList.unshift({businessId: businessId, pack, walletId: walletId, timestamp: Date.now()})
            if (posTransactionsHistoryList.length > 50) { 
              posTransactionsHistoryList.slice(0, 51);
            }
          }),
          map(() => ({
            _id: Crosscutting.generateHistoricalUuid(),
            type: 'PURCHASE', concept: 'VEHICLE_SUBSCRIPTION',      
            businessId, amount,
            fromId: walletId,
            toId: businessId
          })),
          // to to something before send Other event 
          mergeMap((tx) => forkJoin(
            eventSourcing.eventStore.emitEvent$(
              new Event({
                eventType: "WalletTransactionCommited",
                eventTypeVersion: 1,
                aggregateType: "Wallet",
                aggregateId: uuidv4(),
                data: tx, user: user
              })
            ),
            eventSourcing.eventStore.emitEvent$(
              new Event({
                eventType: "VehicleSubscriptionPaid",
                eventTypeVersion: 2,
                aggregateType: "Vehicle",
                aggregateId: uuidv4(),
                data: {
                  licensePlate: plate, packProduct: pack,
                  quantity: qty, amount,
                  businessId: businessId,
                  daysPaid: PRODUCT_DAYS_PACK_MAPPER[pack] * qty
                },
                user: user
              })
            ),
    
          ))
        )
      }
    }else {
      return of({}).pipe(
        map(() => ({
          _id: Crosscutting.generateHistoricalUuid(),
          type: 'PURCHASE', concept: 'VEHICLE_SUBSCRIPTION',      
          businessId, amount,
          fromId: walletId,
          toId: businessId
        })),
        // to to something before send Other event 
        mergeMap((tx) => forkJoin(
          eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "WalletTransactionCommited",
              eventTypeVersion: 1,
              aggregateType: "Wallet",
              aggregateId: uuidv4(),
              data: tx, user: user
            })
          ),
          eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "VehicleSubscriptionPaid",
              eventTypeVersion: 2,
              aggregateType: "Vehicle",
              aggregateId: uuidv4(),
              data: {
                licensePlate: plate, packProduct: pack,
                quantity: qty, amount,
                businessId: businessId,
                daysPaid: PRODUCT_DAYS_PACK_MAPPER[pack] * qty
              },
              user: user
            })
          ),
  
        )),
      );
    }
  }

  handleSalesPosWithdrawalCommitted$({aid, data, user}){
    const { businessId, amount, walletId } = data;
    return of({}).pipe(
      map(() => ({
        _id: Crosscutting.generateHistoricalUuid(),
        businessId, amount,
        type: 'MOVEMENT', concept: 'WITHDRAWAL',              
        fromId: walletId, toId: businessId
      })),
      // to to something before send Other event 
      mergeMap((tx) => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "WalletTransactionCommited",
          eventTypeVersion: 1,
          aggregateType: "Wallet",
          aggregateId: uuidv4(),
          data: tx, user
        })
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
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
