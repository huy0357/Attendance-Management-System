import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { ShiftTemplatesComponent } from './shift-templates/shift-templates.component';
import { RequestsManagementComponent } from './requests-management/requests-management.component';
import { AttendanceDailyComponent } from './attendance-daily/attendance-daily.component';
import { AttendanceEmailComponent } from './attendance-email/attendance-email.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';
import { MonthlySummaryComponent } from './monthly-summary/monthly-summary.component';
import { MyScheduleComponent } from './my-schedule/my-schedule.component';
import { RoleGuard } from '../../core/auth/role.guard';
import { AttendanceLandingComponent } from './attendance-landing.component';

const routes: Routes = [
  {
    path: 'attendance-daily',
    component: AttendanceDailyComponent,
    canActivate: [RoleGuard],
    // BE: /api/attendance-daily/me + /employee/** → hasAnyRole('EMPLOYEE','MANAGER','ADMIN')
    data: { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'], mode: 'self' },
  },
  {
    path: 'attendance-daily/admin',
    component: AttendanceDailyComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'], mode: 'admin' },
  },
  {
    path: 'attendance-daily/employee/:employeeId',
    component: AttendanceDailyComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'MANAGER'], mode: 'employee' },
  },
  {
    path: 'scheduling',
    component: SchedulingComponent,
    canActivate: [RoleGuard],
    // BE: /api/employee-schedules/** → hasAnyRole('EMPLOYEE','MANAGER','ADMIN')
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'my-schedule',
    component: MyScheduleComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  },
  {
    path: 'monthly-summary',
    component: MonthlySummaryComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'shift-templates',
    component: ShiftTemplatesComponent,
    canActivate: [RoleGuard],
    // BE: /api/shift-templates/** → hasRole('ADMIN') only.
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'leave-management',
    component: LeaveManagementComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  },
  {
    path: 'requests-management',
    component: RequestsManagementComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  },
  {
    path: 'ot-requests',
    component: OtRequestsComponent,
    canActivate: [RoleGuard],
    // BE: /api/requests/manager-queue/** → hasAnyRole('MANAGER','ADMIN')
    data: { roles: ['MANAGER', 'ADMIN'] },
  },

  {
    path: 'attendance-email',
    component: AttendanceEmailComponent,
    canActivate: [RoleGuard],
    // BE: /api/attendance-emails/** → anyRequest().authenticated() - FE restricts further to ADMIN only.
    data: { roles: ['ADMIN'] },
  },
  { path: '', component: AttendanceLandingComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
