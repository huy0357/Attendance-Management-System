import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AccountManagementComponent } from './account-management/account-management.component';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { BackupRestoreComponent } from './backup-restore/backup-restore.component';
import { DevicesLocationsComponent } from './devices-locations/devices-locations.component';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
  declarations: [
    AccountManagementComponent,
    AuditLogComponent,
    BackupRestoreComponent,
    DevicesLocationsComponent,
    SettingsComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}
