import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { authGuard } from '../../core/guards/auth.guard';

export const hrmRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'employees',
        loadComponent: () =>
          import('./employees/employee-list/employee-list.component').then(
            (m) => m.EmployeeListComponent
          ),
        data: { breadcrumb: 'Nhân viên' },
      },
      {
        path: 'face-registration',
        loadComponent: () =>
          import('./face-registration/face-registration.component').then(
            (m) => m.FaceRegistrationComponent
          ),
        data: { breadcrumb: 'Đăng ký khuôn mặt' },
      },
      {
        path: '',
        redirectTo: 'employees',
        pathMatch: 'full',
      },
    ],
  },
];
