"use strict";

require("datejs");
let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");

class WalletDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("../../../data/MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  static updateOneWallet$(Wallet){
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return defer(() => collection.findOneAndUpdate({_id: Wallet._id}, {$set: { ...Wallet }}))
  }

  
}
/**
 * @returns {WalletDA}
 */
module.exports = WalletDA;
