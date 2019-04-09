"use strict";

require("datejs");
let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Vehicle";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");

class VehicleDA {
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

  static findByLicensePlate$(licensePlate){
    // console.log("findByLicensePlate$", licensePlate);
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return defer(() => collection.findOne({licensePlate : licensePlate}));
  }
    
}
/**
 * @returns {VehicleDA}
 */
module.exports = VehicleDA;
