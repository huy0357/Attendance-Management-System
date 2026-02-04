import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout.component';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'test',
        loadComponent: () =>
          import('./login/login-test.component').then((m) => m.LoginTestComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
];
