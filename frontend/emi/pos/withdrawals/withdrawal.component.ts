
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
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';
import { WithdrawaltService } from './withdrawal.service';
import { WithdrawalDialogComponent } from './dialog/dialog.component';


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'withdrawal-component',
  templateUrl: './withdrawal.component.html',
  styleUrls: ['./withdrawal.component.scss'],
  animations: fuseAnimations
})
export class WithdrawalComponent implements OnInit, OnDestroy {

  chargebalanceForm: FormGroup;


  selectedWallet = null;

  walletFilterCtrl = new FormControl();

  packOptions = ['WEEK'];

  walletQueryFiltered$: Observable<any[]>; // Wallet autocomplete supplier
  selectedBusinessId: any;

  disableWithdrawalBtn = false;
  paymentBtnDisabled = false;
  productPrices = null;

  private ngUnsubscribe = new Subject();
  // private walletsUpdatesUnsubscribe = new Subject();
  private walletSelected$ = new Subject();

  @ViewChild('walletInputFilter') walletInputFilter: ElementRef;

  constructor(
    private withdrawaltService: WithdrawaltService,
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
    this.listenWalletUpdates();

  }

  listenWalletUpdates(){

    this.walletSelected$
    .pipe(
      switchMap(walletId => this.withdrawaltService.listenWalletUpdates$(walletId)),
      filter((r: any) => r.data.SalesPoswalletsUpdates),
      map((r: any) => r.data.SalesPoswalletsUpdates),
      tap((r: any) => this.selectedWallet.pockets = r.pockets),
      takeUntil(this.ngUnsubscribe),
    )
    .subscribe(
      r => console.log('onResult => ', r),
      e => console.log('onError', e),
      () => console.log('SUBSCRIPTION COMPLETED')
    );
  }

  initializeForms(){
    this.chargebalanceForm = new FormGroup({
      withdrawalValue: new FormControl(null, [Validators.required]),
    });
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  makeBalanceWithdraw(){
    const valueToReload = this.chargebalanceForm.getRawValue().withdrawalValue;
    return this.showConfirmationDialog$(
      this.translate.instant('WITHDRAWAL.DIALOG.CONFIRMATION_WITHDRAWAL'),
      this.translate.instant('WITHDRAWAL.DIALOG.BALANCE_WITHDRAWAL_TITLE'),
      'WITHDRAWAL', valueToReload)
    .pipe(
      tap(() => this.disableWithdrawalBtn = true),
      mergeMap(() => of(this.selectedBusinessId)),
      filter(buId => {
        if (!buId){
          this.showMessageSnackbar('ERRORS.2');
        }
        return buId;
      }),
      mergeMap((buId) => this.withdrawaltService.withdrawBalance$(this.selectedWallet._id, buId, valueToReload)),
      mergeMap(r => this.graphQlAlarmsErrorHandler$(r)),      
      mergeMap(r => {
        if ( r && r.data && r.data.SalesPosBalanceWithdraw && r.data.SalesPosBalanceWithdraw.code === 200){
          this.showMessageSnackbar('SUCCESS.1');          
        }
        this.chargebalanceForm = new FormGroup({
          withdrawalValue: new FormControl(0, [Validators.required]),
        });
        this.disableWithdrawalBtn = false;
        return of({});
      })


    )
    .subscribe();
  }

  onSelectWalletEvent(wallet){
    this.selectedWallet = wallet;
    this.walletSelected$.next(wallet._id);
  }



  clearSelectedWallet(){
    this.selectedWallet = null;
    this.walletFilterCtrl.setValue(null);
  }

  showConfirmationDialog$(dialogMessage, dialogTitle, type, value) {
    return this.dialog
      .open(WithdrawalDialogComponent, {
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


  displayFn(wallet): string | undefined {
    return wallet ? `${wallet.fullname}: ${wallet.documentId} (${this.translate.instant('WITHDRAWAL.ENTITY_TYPES.' + wallet.type)})` : '';
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
    return this.withdrawaltService.getWalletsByFilter(filterText, this.selectedBusinessId, limit)
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
          ? this.withdrawaltService.getProductsPrices$(this.selectedBusinessId).pipe(map(r => (r && r.data) ? r.data.SalesPosProductPrices : null))
          : of(null)
        ),
        tap(pp => this.productPrices = pp),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe();
  }



}
