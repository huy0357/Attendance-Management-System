import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { HrmRoutingModule } from './hrm-routing.module';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { SharedModule } from '../../shared/shared.module';
import { ContractsComponent } from './contracts/contracts.component';
import { OrgChartComponent } from './org-chart/org-chart.component';
import { PerformanceReviewComponent } from './performance-review/performance-review.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { DepartmentListComponent } from './departments/department-list/department-list.component';

@NgModule({
  declarations: [
    EmployeesComponent,
    EmployeePortalComponent,
    ContractsComponent,
    OrgChartComponent,
    PerformanceReviewComponent,
    OnboardingComponent,
    DepartmentListComponent
  ],
  imports: [
    CommonModule,
    HrmRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class HrmModule { }
