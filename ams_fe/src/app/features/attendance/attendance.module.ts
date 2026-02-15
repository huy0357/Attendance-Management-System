import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AttendanceRoutingModule } from './attendance-routing.module';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { TimeCalculationComponent } from './time-calculation/time-calculation.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';

@NgModule({
  declarations: [SchedulingComponent, TimeCalculationComponent, LeaveManagementComponent, OtRequestsComponent],
  imports: [SharedModule, AttendanceRoutingModule],
})
export class AttendanceModule {}
