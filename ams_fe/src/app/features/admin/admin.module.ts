import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AccountManagementComponent } from './account-management/account-management.component';

@NgModule({
  declarations: [AccountManagementComponent],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}
