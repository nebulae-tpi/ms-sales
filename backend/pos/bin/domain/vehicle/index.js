"use strict";

// const VehicleCQRS = require("./VehicleCQRS")();
const { concat } = require('rxjs');
const VehicleES = require("./VehicleES")();
const VehicleDA = require("./data-access/VehicleDA");

module.exports = {
  /**
   * domain start workflow
   */
  start$: concat(VehicleDA.start$()),
  /**
   * @returns {VehicleES}
   */
  VehicleES
};
