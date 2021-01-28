export const locale = {
  lang: 'en',
  data: {
    POS:{
      CANCEL: 'Cancel',
      TITLE: 'POS',
      MISSING_WALLET:'Select a Wallet',
      REALOAD_TITLE: 'Charge Balance',
      CURRENT_WALLET_STATE: 'Current Balance: ',
      SELECT_WALLET: 'Select a Wallet',
      WALLET_INFO:{
        NAME: 'Name',
        DOCUMENT_ID: 'Document ID',
        BALANCE: 'Balance',
        LAST_MOVEMENTS: 'Last Movements',
        TYPE: 'Type'
      },
      CHARGE_BALANCE: {
        AMOUNT: 'Amount',
        MAKE_RELOAD: 'Recharge',
        AMOUNT_REQUIRED: 'Amount Required'
      },
      PAYMENTS: {
        TITLE: 'Payments',
        LICENSE_PLATE: 'Id Vehículo',
        LICENSE_PLATE_REQUIRED: 'Id Vehículo Required',
        MAKE_PAYMENT: 'Pay',
        PACK_NAME_LBL: 'Pack',
        PACK_QUANTITY: 'Quantity',
        PACK_OPTIONS: {
          DAY: 'Day',
          WEEK: 'Week',
          MONTH: 'Month',
          FORTNIGTH: 'Fortnigth'
        }
      },
      ENTITY_TYPES: {
        DRIVER: 'Driver',
        BUSINESS: 'Business',
        USER: 'Users',
        CLIENT: 'client'
      },
      DIALOG:{
        RELOAD_WALLET_TITLE: 'Reload Balance',
        CONFIRMATION_RECHARGE: 'Are you sure you want to recharge the balance with: ',
        PURCHASE_WALLET_TITLE: 'Subscription Payment',
        CONFIRMATION_PURCHASE: 'Are you sure you want to Pay the Subscription by : '
      }
      
    },
    ERRORS:{
      1: 'Internal Server Error',
      2: 'Please Select a Business Unit',      
      19003: "Insufficient balance",
      19004: 'Vehicle doesn\'t Exist in System',
      19005: 'Vehicle doesn\'t active',
      19006: 'Vehicle doesn\'t Exist in System',
    },
    SUCCESS:{
      1: 'Balance Reload Successful',
      2: 'Successful Subscription Payment'
     
    }
    
  }
};
