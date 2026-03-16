import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { BackupRestoreComponent } from './backup-restore/backup-restore.component';
import { SettingsComponent } from './settings/settings.component';
import { ProfileComponent } from './profile/profile.component';
import { DevicesLocationsComponent } from './devices-locations/devices-locations.component';
import { AccountManagementComponent } from './account-management/account-management.component';

@NgModule({
  declarations: [
    AuditLogComponent,
    BackupRestoreComponent,
    SettingsComponent,
    ProfileComponent,
    DevicesLocationsComponent,
    AccountManagementComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}
