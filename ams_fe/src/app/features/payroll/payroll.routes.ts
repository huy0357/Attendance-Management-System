import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { authGuard } from '../../core/guards/auth.guard';

export const payrollRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./salary-dashboard/salary-dashboard.component').then(
            (m) => m.SalaryDashboardComponent
          ),
        data: { breadcrumb: 'Bảng lương' },
      },
      {
        path: 'kpi',
        loadComponent: () =>
          import('./kpi/kpi.component').then((m) => m.KpiComponent),
        data: { breadcrumb: 'KPI' },
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
