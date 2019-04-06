"use strict";

const { concat } = require('rxjs');
const PosCQRS = require("./PosCQRS")();
const PosES = require("./PosES")();

const PosDA = require("./data-access/PosDA");
const TransactionsDA = require("./data-access/TransactionsDA");
const VehicleDA = require("./data-access/VehicleDA");

module.exports = {
  /**
   * domain start workflow
   */
  start$: concat(PosDA.start$(), TransactionsDA.start$(), VehicleDA.start$() ),
  /**
   * @returns {PosCQRS}
   */
  PosCQRS,
  /**
   * @returns {PosES}
   */
  PosES
};

