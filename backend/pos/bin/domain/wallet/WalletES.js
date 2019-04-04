"use strict";

const { of, forkJoin} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, delay } = require("rxjs/operators");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const uuidv4 = require("uuid/v4");
const WalletDA = require("./data-access/WalletDA");

/**
 * Singleton instance
 */
let instance;

class WalletES {
  constructor() {

      of({})
      .pipe(
        delay(2000),
        mergeMap(() => eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "WalletUpdated",
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: "sd989845--14-g4--f0-6-g4-6-45-f4o9",
            data: { 
              _id: "23423lk232342f2-2-34-",
              businessId: "q1w2e3-r4t23e2-234r34-53t4-",
              type: 'BUSINESS',
              fullname: "(rawdata.generalInfo || {}).name",
              documentId: "(rawdata.generalInfo || {}).documentId",
              pockets: { main: 250, credit: 0, bonus: 0 }
            },
            user: "SYSTEM"
          })
        ))
      )
    .subscribe()

  }

  handleWalletUpdated$({aid, data}){
    console.log("handleWalletUpdated$", aid, data);
    return of(data)
      .pipe(
        mergeMap(wallet => forkJoin(
          broker.send$(MATERIALIZED_VIEW_TOPIC, 'WalletsUpdateReported', wallet),
          WalletDA.updateOne$(wallet)
        ))
      );
  }
}

/**
 * @returns {WalletES}
 */
module.exports = () => {
  if (!instance) {
    instance = new WalletES();
    console.log(`${instance.constructor.name} ##################Singleton created`);
  }
  return instance;
};
