
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
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
import { ToolbarService } from '../../../toolbar/toolbar.service';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { PosPaymentDialogComponent } from './dialog/dialog.component';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';
import { PosPaymentService } from './pos-payment.service';


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'pos-payment-component',
  templateUrl: './pos-payment.component.html',
  styleUrls: ['./pos-payment.component.scss'],
  animations: fuseAnimations
})
export class PosPaymentComponent implements OnInit, OnDestroy {

  chargebalanceForm: FormGroup;
  productPaymentForm: FormGroup;


  selectedWallet = null;

  walletFilterCtrl = new FormControl();

  packOptions = ['WEEK'];

  walletQueryFiltered$: Observable<any[]>; // Wallet autocomplete supplier
  selectedBusinessId: any;

  chargeBtnDisabled = false;
  paymentBtnDisabled = false;
  productPrices = null;

  private ngUnsubscribe = new Subject();
  private walletsUpdatesUnsubscribe = new Subject();

  @ViewChild('walletInputFilter') walletInputFilter: ElementRef;

  constructor(
    private posService: PosPaymentService,
    private translate: TranslateService,
    private toolbarService: ToolbarService,
    private translationLoader: FuseTranslationLoaderService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {

    this.initializeForms();
    this.initializeWalletAutoComplete();
    this.listenbusinessChanges(); // Listen busineses changes in toolbar
  }

  listenWalletUpdates(walletId: string){
    this.posService.listenWalletUpdates$(walletId)
    .pipe(
      filter(r => r.data.SalesPoswalletsUpdates),
      map(r => r.data.SalesPoswalletsUpdates),
      tap((r) => {
        this.selectedWallet.pockets = r.pockets;
      }),
      takeUntil(this.walletsUpdatesUnsubscribe),
      takeUntil(this.ngUnsubscribe),
    )
    .subscribe();
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
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  makeBalanceReload(){
    const valueToReload = this.chargebalanceForm.getRawValue().chargeValue;

    return this.showConfirmationDialog$(
      this.translate.instant('POS.DIALOG.CONFIRMATION_RECHARGE'),
      this.translate.instant('POS.DIALOG.RELOAD_WALLET_TITLE'),
      'RECHARGE', valueToReload)
    .pipe(
      mergeMap(() => of(this.selectedBusinessId)),
      filter(buId => {
        if (!buId){
          this.showMessageSnackbar('ERRORS.2');
        }
        return buId;
      }),
      mergeMap((buId) => this.posService.reloadBalance$(this.selectedWallet._id, buId, valueToReload)),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      tap(() => this.chargeBtnDisabled = true ),
      mergeMap(r => {
        if (r.data.SalesPosReloadBalance.code === 200){
          this.showMessageSnackbar('SUCCESS.1');         
        }
        this.chargebalanceForm = new FormGroup({
          chargeValue: new FormControl(0, [Validators.required]),
        });
        this.chargeBtnDisabled = false;
        return of({});
      })


    )
    .subscribe();
  }

  onSelectWalletEvent(wallet){
    this.selectedWallet = wallet;

    this.listenWalletUpdates(wallet._id);
  }



  clearSelectedWallet(){
    this.selectedWallet = null;
    this.walletFilterCtrl.setValue(null);
    this.walletsUpdatesUnsubscribe.next();
    this.walletsUpdatesUnsubscribe.complete();

  }

  showConfirmationDialog$(dialogMessage, dialogTitle, type, value) {
    return this.dialog
      .open(PosPaymentDialogComponent, {
        data: {
          dialogMessage,
          dialogTitle,
          type, value

        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
      );
  }

  makePayment(){
    const args = this.productPaymentForm.getRawValue();
    return this.showConfirmationDialog$(
      this.translate.instant('POS.DIALOG.CONFIRMATION_PURCHASE'),
      this.translate.instant('POS.DIALOG.PURCHASE_WALLET_TITLE'),
      'PURCHASE', args.qty * this.productPrices.week)
    .pipe(
      mergeMap(() => of(this.selectedBusinessId)),
      filter(buId => {
        if (!buId){
          this.showMessageSnackbar('ERRORS.2');
        }
        return buId;
      }),
      mergeMap((buId) => this.posService.payVehicleSubscription$(this.selectedWallet._id, buId, args.plate.toUpperCase() , args.pack, args.qty)),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(r => (r && r.data && r.data.SalesPosPayVehicleSubscription)),
      tap(() => this.paymentBtnDisabled = true ),
      mergeMap(r => {
        if (r.data.SalesPosPayVehicleSubscription.code === 200){
          this.showMessageSnackbar('SUCCESS.2');
        }
        this.productPaymentForm = new FormGroup({
          plate: new FormControl('', [Validators.required]),
          pack: new FormControl('WEEK'),
          qty: new FormControl(1),
        });
        this.paymentBtnDisabled = false;
        return of({});
      }),
      takeUntil(this.ngUnsubscribe),
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
        tap(r => this.clearSelectedWallet()),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }


  getWalletsFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.posService.getWalletsByFilter(filterText, this.selectedBusinessId, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => (!resp.errors && resp.data && resp.data.salesWalletsByFilter && resp.data.salesWalletsByFilter.length > 0 ) ),
        mergeMap(result => from(result.data.salesWalletsByFilter)),
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

  listenbusinessChanges() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        map(bu => (bu && bu.id) ? bu.id : undefined),
        tap(bu => this.selectedBusinessId = bu),
        mergeMap(bu => bu
          ? this.posService.getProductsPrices$(this.selectedBusinessId).pipe(map(r => (r && r.data) ? r.data.SalesPosProductPrices : null))
          : of(null)
        ),
        tap(pp => this.productPrices = pp),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe();
  }



}
