'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');


/**
 * Singleton instance
 */
let instance;

class HelloWorldES {

    constructor() {
    }

   /**
   * Handle HelloWorld Query, please remove
   * This in an Event HAndler for Event- events
   */
  handleHelloWorld$(evt) {
    return of('Some process for HelloWorld event');
  }

}



/**
 * @returns {HelloWorldES}
 */
module.exports = () => {
    if (!instance) {
        instance = new HelloWorldES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};