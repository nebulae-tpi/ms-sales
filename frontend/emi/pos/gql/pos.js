import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document



export const salesWalletsByFilter = gql`
  query salesWalletsByFilter($filterText: String, $businessId: String, $limit: Int) {
    salesWalletsByFilter(filterText: $filterText, businessId: $businessId, limit: $limit) {
      _id      
      fullname
      type
      documentId
      pockets{
        main
        bonus
      }
    }
  }
`;


export const SalesPosProductPrices = gql`
  query SalesPosProductPrices($businessId: String!) {
    SalesPosProductPrices(businessId: $businessId,) {
      day
      week
      month
      fortnigth
    }
  }
`;




// Mutations
export const MakeBalanceReaload = gql`
  mutation SalesPosReloadBalance($walletId: String!, $businessId: String!, $amount: Int! ){
    SalesPosReloadBalance(walletId: $walletId, businessId: $businessId, amount: $amount){
      code
      message
    }
  }
`;

export const SalesPosPayVehicleSubscription = gql`
  mutation SalesPosPayVehicleSubscription($walletId: String!, $businessId: String!, $plate: String!, $pack: String!, $qty: Int! ){
    SalesPosPayVehicleSubscription(walletId: $walletId, businessId: $businessId, plate: $plate, pack: $pack, qty: $qty){
      code
      message
    }
  }
`;

export const SalesPosBalanceWithdraw = gql`
  mutation SalesPosBalanceWithdraw($walletId: String!, $businessId: String!, $amount: Int! ){
    SalesPosBalanceWithdraw(walletId: $walletId, businessId: $businessId, amount: $amount){
      code
      message
    }
  }
`;

export const SalesPoswalletsUpdates = gql`
  subscription($walletId: String!) {
    SalesPoswalletsUpdates(walletId: $walletId) {
      pockets {
        main
        bonus
      }
    }
  }
`;