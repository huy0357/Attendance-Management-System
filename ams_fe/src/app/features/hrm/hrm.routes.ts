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
        data: { breadcrumb: 'Nhan vien' },
      },
      {
        path: 'employees/new',
        loadComponent: () =>
          import('./employees/employee-form/employee-form.component').then(
            (m) => m.EmployeeFormComponent
          ),
        data: { breadcrumb: 'Them nhan vien' },
      },
      {
        path: 'employees/:id',
        loadComponent: () =>
          import('./employees/employee-form/employee-form.component').then(
            (m) => m.EmployeeFormComponent
          ),
        data: { breadcrumb: 'Chi tiet nhan vien' },
      },
      {
        path: 'employees/:id/detail',
        loadComponent: () =>
          import('./employees/employee-detail/employee-detail.component').then(
            (m) => m.EmployeeDetailComponent
          ),
        data: { breadcrumb: 'Employee Detail' },
      },
      {
        path: 'face-registration',
        loadComponent: () =>
          import('./face-registration/face-registration.component').then(
            (m) => m.FaceRegistrationComponent
          ),
        data: { breadcrumb: 'Dang ky khuon mat' },
      },
      {
        path: '',
        redirectTo: 'employees',
        pathMatch: 'full',
      },
    ],
  },
];
