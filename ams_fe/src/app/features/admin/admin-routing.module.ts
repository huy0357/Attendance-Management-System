import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { AccountManagementComponent } from './account-management/account-management.component';
import { AuditLogComponent } from '../system/audit-log/audit-log.component';
import { SettingsComponent } from './settings/settings.component';
import { RoleManagementComponent } from './role-management/role-management.component';
import { DataExportsComponent } from './data-exports/data-exports.component';
import { BatchProcessingComponent } from './batch-processing/batch-processing.component';
import { RoleGuard } from '../../core/auth/role.guard';

// Defense-in-depth: mỗi route con tự bảo vệ ngoài parent canActivate.
// BE SecurityConfig: /api/admin/**, /api/accounts/**, /api/audit-logs/** → hasRole('ADMIN') only.
const ADMIN_ONLY = { canActivate: [RoleGuard], data: { roles: ['ADMIN'] } };

const routes: Routes = [
  // BE: /api/audit-logs/** → hasRole('ADMIN')
  { path: 'audit-log', component: AuditLogComponent, ...ADMIN_ONLY },
  { path: 'backup-restore', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'devices-locations', redirectTo: 'account-management', pathMatch: 'full' },
  // BE: /api/accounts/** → hasRole('ADMIN')
  { path: 'account-management', component: AccountManagementComponent, ...ADMIN_ONLY },
  { path: 'role-management', component: RoleManagementComponent, ...ADMIN_ONLY },
  { path: 'data-exports', component: DataExportsComponent, ...ADMIN_ONLY },
  { path: 'batch-processing', component: BatchProcessingComponent, ...ADMIN_ONLY },
  { path: 'settings', component: SettingsComponent, ...ADMIN_ONLY },
  { path: 'profile', component: ProfileComponent, ...ADMIN_ONLY },
  { path: '', redirectTo: 'account-management', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
