import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getHelloWorld,
  SalesHelloWorldSubscription,
  salesWalletsByFilter,
  MakeBalanceReaload,
  SalesPosPayVehicleSubscription,
  SalesPosGetLastTransactions
} from './gql/pos';

@Injectable()
export class PosService {


  constructor(private gateway: GatewayService) {

  }

  /**
   * Hello World sample, please remove
   */
  getHelloWorld$() {
    return this.gateway.apollo
      .watchQuery<any>({
        query: getHelloWorld,
        fetchPolicy: 'network-only'
      })
      .valueChanges.map(
        resp => resp.data.getHelloWorldFromSales.sn
      );
  }

  /**
  * Hello World subscription sample, please remove
  */
 getEventSourcingMonitorHelloWorldSubscription$(): Observable<any> {
  return this.gateway.apollo
    .subscribe({
      query: SalesHelloWorldSubscription
    })
    .map(resp => {
      console.log(resp);
      return resp.data.SalesHelloWorldSubscription.sn;
    });
}

getWalletsByFilter(filterText: String, businessId: String, limit: number): Observable<any> {
  return this.gateway.apollo
    .query<any>({
      query: salesWalletsByFilter,
      variables: { filterText, businessId, limit },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
}

getlastwalletsMovements$(walletId, limit){
  return this.gateway.apollo
    .query<any>({
      query: SalesPosGetLastTransactions,
      variables: { walletId, limit },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
}

reloadBalance$(walletId: string, businessId: string, amount: number){
  return this.gateway.apollo
  .mutate<any>({
    mutation: MakeBalanceReaload,
    variables: { walletId, businessId, amount },
    errorPolicy: 'all'
  });

}

payVehicleSubscription$(walletId: string, businessId: string, plate: string, pack: string, qty: number){
  return this.gateway.apollo
  .mutate<any>({
    mutation: SalesPosPayVehicleSubscription,
    variables: { walletId, businessId, plate, pack, qty },
    errorPolicy: 'all'
  });

}


}
