import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { msnamepascalService } from './msname.service';
import { msnamepascalComponent } from './msname.component';

const routes: Routes = [
  {
    path: '',
    component: msnamepascalComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    msnamepascalComponent    
  ],
  providers: [ msnamepascalService, DatePipe]
})

export class msnamepascalModule {}