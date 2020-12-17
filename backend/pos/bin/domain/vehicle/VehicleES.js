'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, delay } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const VehicleDA = require('./data-access/VehicleDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class VehicleES {

    constructor() {
    }


    /**
     * Persists the driver on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleVehicleCreated$(vehicleCreatedEvent) { 
        // console.log("handleVehicleCreated$");
        return of(vehicleCreatedEvent.data)
        .pipe(
            map(vehicle => ({
                _id: vehicle._id,
                businessId: vehicle.businessId,
                licensePlate: vehicle.generalInfo.licensePlate,
                active: vehicle.state,
            })),
            mergeMap(vehicle => VehicleDA.createVehicle$(vehicle)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleVehicleGeneralInfoUpdated$(vehicleGeneralInfoUpdated) { 
        // console.log("handleVehicleGeneralInfoUpdated$");
        return of(vehicleGeneralInfoUpdated.data.generalInfo)
        .pipe(
            map(newGeneralInfo => ({licensePlate: newGeneralInfo.licensePlate,})),
            mergeMap(update => VehicleDA.updateVehicleInfo$(vehicleGeneralInfoUpdated.aid, update)),            
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} VehicleStateUpdatedEvent events that indicates the new state of the driver
     */
    handleVehicleStateUpdated$(VehicleStateUpdatedEvent) {          
        return of(VehicleStateUpdatedEvent.data.state)
        .pipe(
            map(newState => ({ active: newState })),
            mergeMap(update => VehicleDA.updateVehicleInfo$( VehicleStateUpdatedEvent.aid, update)),
        );
    }

}



/**
 * @returns {VehicleES}
 */
module.exports = () => {
    if (!instance) {
        instance = new VehicleES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};