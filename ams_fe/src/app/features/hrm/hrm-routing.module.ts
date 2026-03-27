import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { ContractsComponent } from './contracts/contracts.component';
import { OrgChartComponent } from './org-chart/org-chart.component';
import { PerformanceReviewComponent } from './performance-review/performance-review.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { DepartmentListComponent } from './departments/department-list/department-list.component';
import { RoleGuard } from '../../core/auth/role.guard';

const routes: Routes = [
  {
    path: 'employees',
    component: EmployeesComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
  },
  {
    path: 'employee-portal',
    component: EmployeePortalComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
  },
  {
    path: 'contracts',
    component: ContractsComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'HR', 'MANAGER'] },
  },
  {
    path: 'org-chart',
    component: OrgChartComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'HR', 'MANAGER'] },
  },
  {
    path: 'performance-review',
    component: PerformanceReviewComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'HR', 'MANAGER'] },
  },
  {
    path: 'onboarding',
    component: OnboardingComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'HR'] },
  },
  { path: 'departments', component: DepartmentListComponent },
  { path: '', redirectTo: 'employees', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HrmRoutingModule { }
