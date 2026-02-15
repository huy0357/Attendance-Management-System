import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { ReportsComponent } from './standard/reports.component';
import { CustomReportsComponent } from './custom/custom-reports.component';

@NgModule({
  declarations: [ReportsComponent, CustomReportsComponent],
  imports: [SharedModule, ReportsRoutingModule],
})
export class ReportsModule {}
