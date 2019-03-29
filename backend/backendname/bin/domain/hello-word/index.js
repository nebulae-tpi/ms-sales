"use strict";

const helloWorldCQRS = require("./HelloWorldCQRS")();
const helloWorldES = require("./HelloWorldES")();

module.exports = {
  /**
   * @returns {HelloWorldCQRS}
   */
  helloWorldCQRS,
  /**
   * @returns {HelloWorldES}
   */
  helloWorldES
};
