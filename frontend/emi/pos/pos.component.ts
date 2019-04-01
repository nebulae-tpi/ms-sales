import { PosService } from './pos.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { TranslateService } from '@ngx-translate/core';
import {
  map,
  mergeMap,
  switchMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take
} from 'rxjs/operators';
import { Subject, Observable, concat, forkJoin, from } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormControl
} from '@angular/forms';
import { ToolbarService } from '../../toolbar/toolbar.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'pos-component',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  animations: fuseAnimations
})
export class PosComponent implements OnInit, OnDestroy {

  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Observable<any>;
  helloWorldLabelSubscription$: Observable<any>;


  selectedWallet = {
    fulname: 'FELIPE SANTA',
    pockets: {
      main: 15200
    }
  };

  lastMovements = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  walletFilterCtrl = new FormControl();

  walletQueryFiltered$: Observable<any[]>; // Wallet autocomplete supplier
  selectedBusinessId: any;

  constructor(
    private posService: PosService,
    private translate: TranslateService,
    private toolbarService: ToolbarService,
    ) {

  }


  ngOnInit() {
    this.helloWorldLabelQuery$ = this.posService.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.posService.getEventSourcingMonitorHelloWorldSubscription$();
    this.initializeWalletAutoComplete();

    this.listenbusinessChanges(); // Listen busineses changes in toolbar
  }


  ngOnDestroy() {
  }

  onSelectWalletEvent(wallet){
    console.log('onSelectWalletEvent', wallet);
  }

  displayFn(wallet): string | undefined {
    return wallet ? `${wallet.fullname}: ${wallet.documentId} (${this.translate.instant('WALLET.ENTITY_TYPES.' + wallet.type)})` : '';
  }

  displayFnWrapper() {
    return (offer) => this.displayFn(offer);
  }

  initializeWalletAutoComplete() {
    this.walletQueryFiltered$ = this.walletFilterCtrl.valueChanges.pipe(
      startWith(undefined),
      filter(filterValue  => typeof filterValue === 'string'),
      debounceTime(500),
      distinctUntilChanged(),
      mergeMap((filterText: String) => this.getWalletsFiltered$(filterText, 10))
    );
  }

  getWalletsFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.posService.getWalletsByFilter(filterText, this.selectedBusinessId, limit)
      .pipe(
        // mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        // filter(resp => !resp.errors),
        // mergeMap(result => from(result.data.getWalletsByFilter)),
        tap(r => console.log(r)),
        toArray()
      );
  }

  listenbusinessChanges(){
    this.toolbarService.onSelectedBusiness$
    .pipe(
      tap(bu => this.selectedBusinessId = (bu && bu.id) ? bu.id : undefined)
    )
    .subscribe();
  }

}
