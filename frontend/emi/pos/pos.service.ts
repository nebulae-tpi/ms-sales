import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getHelloWorld,
  SalesHelloWorldSubscription
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
  // return this.gateway.apollo
  //   .query<any>({
  //     query: getWalletsByFilter,
  //     variables: { filterText, businessId, limit },
  //     fetchPolicy: 'network-only',
  //     errorPolicy: 'all'
  //   });
  return of([
    {
      fullname: 'felipe santa',
      pockets: {
        main: 125
      }
    },
    {
      fullname: 'fernando santa',
      pockets: {
        main: 125
      }
    },
    {
      fullname: 'daniel santa',
      pockets: {
        main: 125
      }
    }

  ]);
}

}
