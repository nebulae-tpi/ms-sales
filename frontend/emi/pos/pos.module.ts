import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { DialogComponent } from './dialog/dialog.component';

import { PosService } from './pos.service';
import { PosComponent } from './pos.component';

const routes: Routes = [
  {
    path: '',
    component: PosComponent,
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
    DialogComponent,
    PosComponent    
  ],
  entryComponents: [DialogComponent],
  providers: [ PosService, DatePipe]
})

export class PosModule {}