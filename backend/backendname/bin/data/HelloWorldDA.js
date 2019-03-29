'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "CollectionName";//please change
const { CustomError } = require('../tools/customError');
const { map } = require('rxjs/operators');
const { of, Observable } = require('rxjs');


class HelloWorldDA {

  static start$(mongoDbInstance) {
    return Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }
  
  /**
   * get hello world data
   * @param {string} type
   */
  static getHelloWorld$(evt) {
    return of(`{sn: Hello World ${Date.now()}}`)
      .pipe(
        map(val => ({ sn: val }))
      );
  }
}
/**
 * @returns {HelloWorldDA}
 */
module.exports =  HelloWorldDA 