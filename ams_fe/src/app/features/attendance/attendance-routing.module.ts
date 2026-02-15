import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { TimeCalculationComponent } from './time-calculation/time-calculation.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';

const routes: Routes = [
  { path: 'scheduling', component: SchedulingComponent },
  { path: 'time-calculation', component: TimeCalculationComponent },
  { path: 'leave-management', component: LeaveManagementComponent },
  { path: 'ot-requests', component: OtRequestsComponent },
  { path: '', redirectTo: 'scheduling', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
