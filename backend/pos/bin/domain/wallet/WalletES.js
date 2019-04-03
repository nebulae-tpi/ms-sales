"use strict";

const { of, forkJoin} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require("rxjs/operators");
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
  constructor() {}

  handleWalletPocketUpdated$({aid, data}){
    // console.log("handleWalletPocketUpdated$", aid, data);
    return of(data)
      .pipe(
        mergeMap(wallet => forkJoin(
          broker.send$(MATERIALIZED_VIEW_TOPIC, 'WalletsUpdateReported', wallet),
          WalletDA.updateOneWallet$(wallet)
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
