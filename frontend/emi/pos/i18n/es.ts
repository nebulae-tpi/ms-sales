export const locale = {
  lang: 'es',
  data: {
    POS:{
      CANCEL: 'Cancelar',
      TITLE: 'POS',
      MISSING_WALLET:'Selecciona Billetera',
      REALOAD_TITLE: 'Recarga de Saldo',
      CURRENT_WALLET_STATE: 'Saldo Actual: ',
      SELECT_WALLET: 'Selecciona Billetera',
      WALLET_INFO:{
        NAME: 'Nombre',
        DOCUMENT_ID: 'Documento',
        BALANCE: 'Saldo',
        LAST_MOVEMENTS: 'Últimos Movimientos',
        TYPE: 'Tipo'
      },
      CHARGE_BALANCE: {
        AMOUNT: 'Valor',
        MAKE_RELOAD: 'Realizar Recarga',
        AMOUNT_REQUIRED: 'Monto Requerido'
      },
      PAYMENTS: {
        TITLE: 'Pagos',
        LICENSE_PLATE: 'Id Vehículo',
        LICENSE_PLATE_REQUIRED: 'Id Vehículo Requerida',
        MAKE_PAYMENT: 'Realizar Pago',
        PACK_NAME_LBL: 'Plan',
        PACK_QUANTITY: 'Cantidad',
        PACK_OPTIONS: {
          DAY: 'Día',
          WEEK: 'Semana',
          MONTH: 'Mes',
          FORTNIGTH: 'Quincena'
        }
      },
      ENTITY_TYPES: {
        DRIVER: 'Conductor',
        BUSINESS: 'Unidad de Negocio',
        USER: 'Usuario',
        CLIENT: 'cliente'
      },
      DIALOG:{
        RELOAD_WALLET_TITLE: 'Recarga de Saldo',
        CONFIRMATION_RECHARGE: 'Estás Seguro que Deseas Recargar Saldo por valor de : ',
        PURCHASE_WALLET_TITLE: 'Pago de Subscripción',
        CONFIRMATION_PURCHASE: 'Estás Seguro que Deseas Pagar la Subscripción por : '
      }
    },
    ERRORS:{
      1: 'Error Interno del Servidor',
      2: 'Seleccione Unidad de Negocio',
      19003: "Saldo Insuficiente",
      19004: 'El Vehículo no Existe en el Sistema',
      19005: 'El Vehículo no Está Activo',
      19006: 'El Vehículo no Existe en el Sistema',
      19010: 'Se ha encontrado una anomalia en la transacción, por favor verficar que se haya realizado correctamente'
    },
    SUCCESS:{
      1: 'Recarga Exitosa',
      2: 'Pago de Subscripción Exitoso'     
    }
  }
};
