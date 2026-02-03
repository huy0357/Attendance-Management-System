import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { authGuard } from '../../core/guards/auth.guard';

export const attendanceRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'timesheet',
        loadComponent: () =>
          import('./timesheet/timesheet.component').then((m) => m.TimesheetComponent),
        data: { breadcrumb: 'Bảng công' },
      },
      {
        path: 'shifts',
        loadComponent: () =>
          import('./shifts/shifts.component').then((m) => m.ShiftsComponent),
        data: { breadcrumb: 'Ca làm việc' },
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./calendar/calendar.component').then((m) => m.CalendarComponent),
        data: { breadcrumb: 'Lịch làm việc' },
      },
      {
        path: '',
        redirectTo: 'timesheet',
        pathMatch: 'full',
      },
    ],
  },
];
