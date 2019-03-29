import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { SalesService } from './sales.service';
import { SalesComponent } from './sales.component';

const routes: Routes = [
  {
    path: '',
    component: SalesComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    SalesComponent    
  ],
  providers: [ SalesService, DatePipe]
})

export class SalesModule {}