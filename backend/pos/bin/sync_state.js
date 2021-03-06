'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const mongoDB = require('./data/MongoDB').singleton();
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const Rx = require('rxjs');

const Pos = require("./domain/pos");
const Wallet = require("./domain/wallet");
const Vehicle = require("./domain/vehicle");

const start = () => {
    Rx.concat(
        Wallet.start$,
        Pos.start$,
        Vehicle.start$,
        // initializing needed resources
        mongoDB.start$(),
        eventSourcing.eventStore.start$(),


        
        // // executing maintenance tasks
        eventStoreService.syncState$(),

        // stoping resources
        eventSourcing.eventStore.stop$(),
        eventStoreService.stop$(),
        mongoDB.stop$(),
    ).subscribe(
        (evt) => console.log(`sales (syncing): ${(evt instanceof Object) ? JSON.stringify(evt) : evt}`),
        (error) => {
            console.error('Failed to sync state', error);
            process.exit(1);
        },
        () => {
            console.log('sales state synced');
            process.exit(0);
        }
    );
}

start();



