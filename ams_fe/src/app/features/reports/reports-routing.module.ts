import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsComponent } from './standard/reports.component';
import { CustomReportsComponent } from './custom/custom-reports.component';

const routes: Routes = [
  { path: 'standard', component: ReportsComponent },
  { path: 'custom', component: CustomReportsComponent },
  { path: '', redirectTo: 'standard', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}
