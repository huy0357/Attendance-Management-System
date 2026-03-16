import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PayrollFormulaComponent } from './formula/payroll-formula.component';
import { PayrollReviewComponent } from './review/payroll-review.component';
import { PayrollPeriodsComponent } from './periods/payroll-periods.component';
import { TaxConfigurationComponent } from './tax-configuration/tax-configuration.component';

const routes: Routes = [
  { path: 'formula', component: PayrollFormulaComponent },
  { path: 'review', component: PayrollReviewComponent },
  { path: 'periods', component: PayrollPeriodsComponent },
  { path: 'tax-configuration', component: TaxConfigurationComponent },
  { path: '', redirectTo: 'formula', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PayrollRoutingModule {}
