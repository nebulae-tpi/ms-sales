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

//Hello world sample, please remove
export const SalesHelloWorldSubscription = gql`
  subscription{
    SalesHelloWorldSubscription{
      sn
  }
}`;
