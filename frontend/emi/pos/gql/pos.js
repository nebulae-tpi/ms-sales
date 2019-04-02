import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFromSales{
    getHelloWorldFromSales{
      sn
    }
  }
`;

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


export const SalesPosGetLastTransactions = gql`
  query SalesPosGetLastTransactions($walletId: String!, $limit: Int) {
    SalesPosGetLastTransactions(walletId: $walletId, limit: $limit) {
      _id
      timestamp
      walletId
      type
      concept
      pocket
      amount
      user
      notes
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

//Hello world sample, please remove
export const SalesHelloWorldSubscription = gql`
  subscription{
    SalesHelloWorldSubscription{
      sn
  }
}`;

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