'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}


const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const graphQlService = require('./services/emi-gateway/GraphQlService')();
const Rx = require('rxjs');
const Pos = require("./domain/pos");
const Wallet = require("./domain/wallet");
const Vehicle = require("./domain/vehicle");

const start = () => {
    Rx.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        Wallet.start$,
        Pos.start$,
        Vehicle.start$,
        mongoDB.start$(),
        graphQlService.start$()
    ).subscribe(
        (evt) => {},
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('sales started')
    );
};

start();


