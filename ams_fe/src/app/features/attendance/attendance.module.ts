import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AttendanceRoutingModule } from './attendance-routing.module';
import { SchedulingComponent } from './scheduling/scheduling.component';
import { LeaveManagementComponent } from './leave-management/leave-management.component';
import { OtRequestsComponent } from './ot-requests/ot-requests.component';
import { ShiftTemplatesComponent } from './shift-templates/shift-templates.component';
import { RequestsManagementComponent } from './requests-management/requests-management.component';
import { AttendanceDailyComponent } from './attendance-daily/attendance-daily.component';
import { AttendanceEmailComponent } from './attendance-email/attendance-email.component';
import { AttendanceLandingComponent } from './attendance-landing.component';

@NgModule({
  declarations: [
    SchedulingComponent,
    LeaveManagementComponent,
    OtRequestsComponent,
    ShiftTemplatesComponent,
    RequestsManagementComponent,
    AttendanceDailyComponent,
    AttendanceEmailComponent,
    AttendanceLandingComponent,
  ],
  imports: [SharedModule, AttendanceRoutingModule],
})
export class AttendanceModule {}
