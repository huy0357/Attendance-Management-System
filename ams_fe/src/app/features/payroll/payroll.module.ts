import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PayrollRoutingModule } from './payroll-routing.module';
import { PayrollFormulaComponent } from './formula/payroll-formula.component';
import { PayrollReviewComponent } from './review/payroll-review.component';
import { PayrollPeriodsComponent } from './periods/payroll-periods.component';
import { TaxConfigurationComponent } from './tax-configuration/tax-configuration.component';

@NgModule({
  declarations: [PayrollFormulaComponent, PayrollReviewComponent, PayrollPeriodsComponent, TaxConfigurationComponent],
  imports: [SharedModule, PayrollRoutingModule],
})
export class PayrollModule {}
