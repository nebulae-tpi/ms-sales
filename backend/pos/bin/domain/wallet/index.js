"use strict";

const { concat } = require('rxjs');
const WalletCQRS = require("./WalletCQRS")();
const WalletES = require("./WalletES")();

const WalletDA = require("./data-access/WalletDA");

module.exports = {
  /**
   * domain start workflow
   */
  start$: concat(WalletDA.start$()),
  /**
   * @returns {WalletCQRS}
   */
  WalletCQRS,
  /**
   * @returns {WalletES}
   */
  WalletES
};

