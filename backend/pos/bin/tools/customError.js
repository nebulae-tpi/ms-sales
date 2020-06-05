//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 00001;
const PERMISSION_DENIED_ERROR = {code: 19002, description: 'Permission denied'};

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
    constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE , message = '') {
      super(message); 
      this.code = code;
      this.name = name;
      this.method = method;
    }
  
    getContent(){
      return {
        name: this.name,
        code: this.code,
        msg: this.message,      
        method: this.method,
        // stack: this.stack
      }
    }
  };

  class DefaultError extends Error{
    constructor(anyError){
      super(anyError.message)
      this.code = INTERNAL_SERVER_ERROR_CODE;
      this.name = anyError.name;
      this.msg = anyError.message;
      // this.stack = anyError.stack;
    }

    getContent(){
      return{
        code: this.code,
        name: this.name,
        msg: this.msg
      }
    }
  }

  module.exports =  { 
    CustomError,
    DefaultError,
    PERMISSION_DENIED: 00002,
    PERMISSION_DENIED_ERROR,
    INSUFFICIENT_BALANCE:  {code: 19003, description: 'Insufficient balance'},
    VEHICLE_NO_FOUND: {code: 19004, description: 'Vehicle not found'},
    VEHICLE_IS_INACTIVE: {code: 19005, description: 'Vehicle is inactive'},
    VEHICLE_FROM_OTHER_BU : {code: 19006, description: 'Vehicle is OF other BU'},
    BUSINESS_HAVE_NOT_PRICES_CONF : { code: 19007, description: 'Prices configuration no found'},
    BUSINESS_ID_MISSING_ON_TOKEN: { code: 19008, description: 'Business ID missing on token' },
    DRIVER_ID_MISSING_ON_TOKEN: { code: 19009, description: 'Driver ID missing on token'}
  } 