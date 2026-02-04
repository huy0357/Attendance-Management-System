import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { authGuard } from '../../core/guards/auth.guard';

export const faceRecognitionRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'check-in',
        loadComponent: () =>
          import('./check-in-machine/check-in-machine.component').then(
            (m) => m.CheckInMachineComponent
          ),
        data: { breadcrumb: 'Máy chấm công' },
      },
      {
        path: '',
        redirectTo: 'check-in',
        pathMatch: 'full',
      },
    ],
  },
];
