"use strict";

const { of, interval } = require("rxjs");
const HelloWorldDA = require("../../data/HelloWorldDA");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { take, mergeMap, catchError, map } = require('rxjs/operators');
const {
  CustomError,
  DefaultError
} = require("../../tools/customError");

/**
 * Singleton instance
 */
let instance;

class HelloWorld {
  constructor() {
    this.initHelloWorldEventGenerator();
  }

  /**
   *  HelloWorld Query, please remove
   *  this is a queiry form GraphQL
   */
  getHelloWorld$(request) {
    return HelloWorldDA.getHelloWorld$().pipe(
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err)) 
    );
  }

  initHelloWorldEventGenerator(){
    interval(1000).pipe(
      take(120),
      mergeMap(() =>  HelloWorldDA.getHelloWorld$()),
      mergeMap(evt => broker.send$(MATERIALIZED_VIEW_TOPIC, 'businessWalletHelloWorldEvent',evt))
    )
    .subscribe(
      (evt) => console.log('emi-gateway GraphQL sample event sent, please remove'),
      (err) => { 
        console.log(err);
        console.error('emi-gateway GraphQL sample event sent ERROR, please remove')
      },
      () => console.log('emi-gateway GraphQL sample event sending STOPPED, please remove'),
    );
  }


  //#region  mappers for API responses
  errorHandler$(err) {
    return of(err).pipe(
      map(err => {
        const exception = { data: null, result: {} };
        const isCustomError = err instanceof CustomError;
        if (!isCustomError) {
          err = new DefaultError(err)
        }
        exception.result = {
          code: err.code,
          error: { ...err.getContent() }
        }
        return exception;
      }
      )
    );
  }

  
  buildSuccessResponse$(rawRespponse) {
    return of(rawRespponse)
      .pipe(
        map(resp => ({
          data: resp,
          result: {
            code: 200
          }
        }))
      );
  }

  //#endregion


}

/**
 * @returns {HelloWorld}
 */
module.exports = () => {
  if (!instance) {
    instance = new HelloWorld();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
