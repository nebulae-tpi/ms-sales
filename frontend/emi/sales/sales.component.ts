import { SalesService } from './sales.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
  animations: fuseAnimations
})
export class SalesComponent implements OnInit, OnDestroy {
  
  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Rx.Observable<any>;
  helloWorldLabelSubscription$: Rx.Observable<any>;

  constructor(private Saleservice: SalesService  ) {    

  }
    

  ngOnInit() {
    this.helloWorldLabelQuery$ = this.Saleservice.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.Saleservice.getEventSourcingMonitorHelloWorldSubscription$();
  }

  
  ngOnDestroy() {
  }

}
