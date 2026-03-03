import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { TimeCalculationComponent } from './time-calculation/time-calculation.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';
import { ShiftTemplatesComponent } from './shift-templates/shift-templates.component';
import { RequestsManagementComponent } from './requests-management/requests-management.component';
import { RoleGuard } from '../../core/auth/role.guard';

const routes: Routes = [
  {
    path: 'scheduling',
    component: SchedulingComponent,
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'] },
  },
  { path: 'shift-templates', component: ShiftTemplatesComponent },
  { path: 'time-calculation', component: TimeCalculationComponent },
  { path: 'leave-management', component: LeaveManagementComponent },
  { path: 'ot-requests', component: OtRequestsComponent },
  { path: 'requests-management', component: RequestsManagementComponent },
  { path: '', redirectTo: 'scheduling', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
