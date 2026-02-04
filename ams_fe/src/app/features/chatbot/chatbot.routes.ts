import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { authGuard } from '../../core/guards/auth.guard';

export const chatbotRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./chatbot.component').then((m) => m.ChatbotComponent),
        data: { breadcrumb: 'Chatbot' },
      },
    ],
  },
];
