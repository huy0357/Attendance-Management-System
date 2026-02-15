import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { BackupRestoreComponent } from './backup-restore/backup-restore.component';
import { SettingsComponent } from './settings/settings.component';
import { ProfileComponent } from './profile/profile.component';
import { DevicesLocationsComponent } from './devices-locations/devices-locations.component';
import { AccountManagementComponent } from './account-management/account-management.component';

const routes: Routes = [
  { path: 'audit-log', component: AuditLogComponent },
  { path: 'backup-restore', component: BackupRestoreComponent },
  { path: 'devices-locations', component: DevicesLocationsComponent },
  { path: 'account-management', component: AccountManagementComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'settings', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
