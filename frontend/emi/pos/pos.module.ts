import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { PosPaymentDialogComponent } from './posPayments/dialog/dialog.component';

import { PosPaymentComponent } from './posPayments/pos-payment.component';
import { PosPaymentService } from './posPayments/pos-payment.service';

import { WithdrawalDialogComponent } from './withdrawals/dialog/dialog.component';
import { WithdrawaltService } from './withdrawals/withdrawal.service';
import { WithdrawalComponent } from './withdrawals/withdrawal.component'

const routes: Routes = [
  {
    path: '',
    redirectTo: 'payments'
  },
  {
    path: 'payments',
    component: PosPaymentComponent,
  },
  {
    path: 'withdrawal',
    component: WithdrawalComponent,
  }
];


@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    CurrencyMaskModule
  ],
  declarations: [
    PosPaymentDialogComponent,
    PosPaymentComponent,
    WithdrawalDialogComponent,
    WithdrawalComponent
  ],
  entryComponents: [PosPaymentDialogComponent, WithdrawalDialogComponent],
  providers: [ DatePipe, PosPaymentService, WithdrawaltService]
})

export class PosModule {}
