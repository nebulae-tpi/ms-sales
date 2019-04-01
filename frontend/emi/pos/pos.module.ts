import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

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
    FuseWidgetModule
  ],
  declarations: [
    PosComponent    
  ],
  providers: [ PosService, DatePipe]
})

export class PosModule {}