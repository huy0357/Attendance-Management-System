import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/core/core.routes').then((m) => m.coreRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'hrm',
    loadChildren: () => import('./features/hrm/hrm.routes').then((m) => m.hrmRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('./features/attendance/attendance.routes').then((m) => m.attendanceRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('./features/payroll/payroll.routes').then((m) => m.payrollRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.reportsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'face-recognition',
    loadChildren: () =>
      import('./features/face-recognition/face-recognition.routes').then(
        (m) => m.faceRecognitionRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'chatbot',
    loadChildren: () =>
      import('./features/chatbot/chatbot.routes').then((m) => m.chatbotRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
