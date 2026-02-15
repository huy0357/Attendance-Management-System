import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { ContractsComponent } from './contracts/contracts.component';
import { OrgChartComponent } from './org-chart/org-chart.component';
import { PerformanceReviewComponent } from './performance-review/performance-review.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { DepartmentListComponent } from './departments/department-list/department-list.component';

const routes: Routes = [
  { path: 'employees', component: EmployeesComponent },
  { path: 'employee-portal', component: EmployeePortalComponent },
  { path: 'contracts', component: ContractsComponent },
  { path: 'org-chart', component: OrgChartComponent },
  { path: 'performance-review', component: PerformanceReviewComponent },
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'departments', component: DepartmentListComponent },
  { path: '', redirectTo: 'employees', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HrmRoutingModule { }
