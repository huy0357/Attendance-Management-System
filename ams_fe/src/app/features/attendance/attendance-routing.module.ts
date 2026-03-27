import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';
import { ShiftTemplatesComponent } from './shift-templates/shift-templates.component';
import { RequestsManagementComponent } from './requests-management/requests-management.component';
import { AttendanceDailyComponent } from './attendance-daily/attendance-daily.component';
import { AttendanceEmailComponent } from './attendance-email/attendance-email.component';
import { RoleGuard } from '../../core/auth/role.guard';

const routes: Routes = [
  {
    path: 'attendance-daily',
    component: AttendanceDailyComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'], mode: 'admin' },
  },
  {
    path: 'attendance-daily/admin',
    component: AttendanceDailyComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'], mode: 'admin' },
  },
  {
    path: 'scheduling',
    component: SchedulingComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'] },
  },
  { path: 'shift-templates', component: ShiftTemplatesComponent },
  {
    path: 'leave-management',
    component: LeaveManagementComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
  },
  {
    path: 'ot-requests',
    component: OtRequestsComponent,
    canActivate: [RoleGuard],
    data: { roles: ['MANAGER'] },
  },
  {
    path: 'requests-management',
    component: RequestsManagementComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
  },
  {
    path: 'attendance-email',
    component: AttendanceEmailComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
  },
  { path: '', redirectTo: 'scheduling', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
