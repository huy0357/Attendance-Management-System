import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle HTTP errors, not network errors
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          // Don't logout on login page
          if (!req.url.includes('/auth/login')) {
            authService.logout();
          }
        }

        if (error.status === 403 && !req.url.includes('/auth/login') && !req.url.includes('/auth/logout')) {
          router.navigate(['/unauthorized']);
        }
      }

      return throwError(() => error);
    })
  );
};
