import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { AccountManagementComponent } from './account-management/account-management.component';

const routes: Routes = [
  // Legacy redirects for removed mock-only admin screens.
  { path: 'audit-log', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'backup-restore', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'devices-locations', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'account-management', component: AccountManagementComponent },
  { path: 'settings', redirectTo: 'account-management', pathMatch: 'full' },
  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'account-management', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
