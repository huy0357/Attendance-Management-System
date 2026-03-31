import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { AccountManagementComponent } from './account-management/account-management.component';
import { AuditLogComponent } from '../system/audit-log/audit-log.component';
import { SettingsComponent } from './settings/settings.component';

const routes: Routes = [
  // Legacy redirects for removed mock-only admin screens.
  { path: 'audit-log', component: AuditLogComponent },
  { path: 'backup-restore', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'devices-locations', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'account-management', component: AccountManagementComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'account-management', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
