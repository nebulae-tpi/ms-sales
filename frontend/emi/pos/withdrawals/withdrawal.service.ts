import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { GatewayService } from '../../../../api/gateway.service';
import {
  salesWalletsByFilter,
  MakeBalanceReaload,
  SalesPosBalanceWithdraw,
  SalesPoswalletsUpdates,
  SalesPosProductPrices
} from '../gql/pos';

@Injectable()
export class WithdrawaltService {


  constructor(private gateway: GatewayService) {

  }

 listenWalletUpdates$(walletId): Observable<any> {
   console.log('listenWalletUpdates$', walletId);
  return this.gateway.apollo
    .subscribe({
      query: SalesPoswalletsUpdates,
      variables: { walletId}
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

getProductsPrices$(businessId){
  return this.gateway.apollo
    .query<any>({
      query: SalesPosProductPrices,
      variables: { businessId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
}


withdrawBalance$(walletId: string, businessId: string, amount: number){
  return this.gateway.apollo
  .mutate<any>({
    mutation: SalesPosBalanceWithdraw,
    variables: { walletId, businessId, amount },
    errorPolicy: 'all'
  });

}



}
