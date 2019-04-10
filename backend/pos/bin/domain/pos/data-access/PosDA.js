"use strict";

require("datejs");
let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");

class PosDA {
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

  static getFilteredWallets$(filterText, businessId, limit = 10) {    
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    const query = { active: true };
    if (filterText) {
      query["$or"] = [
        { fullname: { $regex: filterText, $options: "i" } },
        { documentId: { $regex: filterText, $options: "i" } }
      ];
    }
    if (businessId) {
      query.businessId = businessId;
    }
    return defer(() => collection.find(query).limit(limit).toArray());
  }

  static getWalletById$(walletId) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return defer(() => collection.findOne({_id:walletId}))
  }



  
}
/**
 * @returns {PosDA}
 */
module.exports = PosDA;
