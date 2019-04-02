import { PosService } from './pos.service';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { Subject, Observable, concat, forkJoin, from, of, fromEvent } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FuseTranslationLoaderService } from '../../../core/services/translation-loader.service';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from '@angular/material';


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
  chargebalanceForm: FormGroup;
  productPaymentForm: FormGroup;


  selectedWallet = null;

  lastMovements = [];
  walletFilterCtrl = new FormControl();

  packOptions= ['DAY', 'WEEK', 'MONTH'];

  walletQueryFiltered$: Observable<any[]>; // Wallet autocomplete supplier
  selectedBusinessId: any;

  chargeBtnDisabled = false;
  paymentBtnDisabled = false;
  
  @ViewChild('walletInputFilter') walletInputFilter: ElementRef;

  constructor(
    private posService: PosService,
    private translate: TranslateService,
    private toolbarService: ToolbarService,
    private translationLoader: FuseTranslationLoaderService,
    private snackBar: MatSnackBar,
    ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.helloWorldLabelQuery$ = this.posService.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.posService.getEventSourcingMonitorHelloWorldSubscription$();

    this.initializeForms();
    this.initializeWalletAutoComplete();
    this.listenbusinessChanges(); // Listen busineses changes in toolbar
  }

  initializeForms(){
    this.chargebalanceForm = new FormGroup({
      chargeValue: new FormControl(0, [Validators.required]),
    });

    this.productPaymentForm = new FormGroup({
      plate: new FormControl('', [Validators.required]),
      pack: new FormControl('WEEK'),
      qty: new FormControl(1),
    });

  }


  ngOnDestroy() {
  }

  makeBalanceReload(){
    console.log(this.chargebalanceForm.getRawValue());
    const valueToReload = this.chargebalanceForm.getRawValue().chargeValue;
    return of(this.selectedBusinessId)
    .pipe(
      filter(buId => {
        if(!buId){
          this.showMessageSnackbar('ERRORS.2');
        }
        return buId;
      }),
      mergeMap((buId) => this.posService.reloadBalance$(this.selectedWallet._id, buId, valueToReload)),
      tap(() => this.chargeBtnDisabled = true ),
      mergeMap(r => {
        console.log('GRAPQL RESPONSE =>', r);
        if(r.data.SalesPosReloadBalance.code === 200){
          this.showMessageSnackbar('SUCCESS.1');
          this.chargeBtnDisabled = false;          
        }
        this.chargebalanceForm = new FormGroup({
          chargeValue: new FormControl(0, [Validators.required]),
        });
        return of({});
      })


    )
    .subscribe();
  }

  onSelectWalletEvent(wallet){
    console.log('onSelectWalletEvent', wallet);
    this.selectedWallet = wallet;
    this.posService.getlastwalletsMovements$(wallet._id, 10)
    .pipe(
      filter(r => (r && r.data && r.data.SalesPosGetLastTransactions)),
      map(r => r.data.SalesPosGetLastTransactions),
      tap(txs => this.lastMovements = txs)

    ).subscribe(
      r => {},
      e => {},
      () => {}
    )
  }

  clearSelectedWallet(){
    this.selectedWallet= null;
    this.walletFilterCtrl.setValue(null);

  }

  makePayment(){
    console.log(this.productPaymentForm.getRawValue());
    const args = this.productPaymentForm.getRawValue();
    return of(this.selectedBusinessId)
    .pipe(
      filter(buId => {
        if(!buId){
          this.showMessageSnackbar('ERRORS.2');
        }
        return buId;
      }),
      mergeMap((buId) => this.posService.payVehicleSubscription$(this.selectedWallet._id, buId, args.plate, args.pack, args.qty  )),
      tap(() => this.paymentBtnDisabled = true ),
      mergeMap(r => {
        console.log('GRAPQL RESPONSE =>', r);
        if(r.data.SalesPosPayVehicleSubscription.code === 200){
          this.showMessageSnackbar('SUCCESS.1');
          this.paymentBtnDisabled = false;          
        }
        this.productPaymentForm = new FormGroup({
          plate: new FormControl('', [Validators.required]),
          pack: new FormControl('WEEK'),
          qty: new FormControl(1),
        });
        return of({});
      })


    )
    .subscribe();
    
  }

  displayFn(wallet): string | undefined {
    return wallet ? `${wallet.fullname}: ${wallet.documentId} (${this.translate.instant('POS.ENTITY_TYPES.' + wallet.type)})` : '';
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

    fromEvent(this.walletInputFilter.nativeElement, 'keyup')
      .pipe(
        distinctUntilChanged(),
        filter(e => this.walletInputFilter.nativeElement.value === ''),
        tap(r => this.clearSelectedWallet())
      )
      .subscribe()
  }


  getWalletsFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.posService.getWalletsByFilter(filterText, this.selectedBusinessId, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => (!resp.errors && resp.data && resp.data.salesWalletsByFilter && resp.data.salesWalletsByFilter.length > 0 ) ),        
        mergeMap(result => from(result.data.salesWalletsByFilter)),
        tap(r => console.log(r)),
        toArray()
      );
  }

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

    /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(errorData => {
              this.showMessageSnackbar('ERRORS.' + errorData.message.code);
            });
          }
        });
      }
    }
  }

    /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    const translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData).subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : '',
        detailMessageKey ? data[detailMessageKey] : '',
        {
          duration: 5000
        }
      );
    });
  }

  listenbusinessChanges(){
    this.toolbarService.onSelectedBusiness$
    .pipe(
      tap(bu => this.selectedBusinessId = (bu && bu.id) ? bu.id : undefined)
    )
    .subscribe();
  }

}
