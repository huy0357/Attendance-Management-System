import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { DepartmentListComponent } from './departments/department-list/department-list.component';
import { RoleGuard } from '../../core/auth/role.guard';
import { HrmLandingComponent } from './hrm-landing.component';

const routes: Routes = [
  {
    path: 'employees',
    component: EmployeesComponent,
    canActivate: [RoleGuard],
    // BE: /api/employees/** → hasRole('ADMIN') only. HR không tồn tại trong BE.
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'employee-portal',
    component: EmployeePortalComponent,
    canActivate: [RoleGuard],
    // BE: /api/profile/** → hasAnyRole('EMPLOYEE','MANAGER','ADMIN'). Bỏ HR phantom.
    data: { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  },
  // Legacy redirects for removed mock-only HRM screens.
  { path: 'contracts', redirectTo: '', pathMatch: 'full' },
  { path: 'org-chart', redirectTo: '', pathMatch: 'full' },
  { path: 'performance-review', redirectTo: '', pathMatch: 'full' },
  { path: 'onboarding', redirectTo: '', pathMatch: 'full' },
  {
    path: 'departments',
    component: DepartmentListComponent,
    canActivate: [RoleGuard],
    // BE: /api/departments/** → hasRole('ADMIN') only.
    data: { roles: ['ADMIN'] },
  },
  { path: '', component: HrmLandingComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HrmRoutingModule { }
