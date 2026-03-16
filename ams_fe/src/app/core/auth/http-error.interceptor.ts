import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.authService.isAuthEndpoint(req.url)) {
          const refreshToken = this.authService.getRefreshToken();
          if (!refreshToken) {
            this.handleAuthFailure();
            return throwError(() => error);
          }

          return this.authService.refreshTokens().pipe(
            switchMap(() => {
              const token = this.authService.getAccessToken();
              const retryReq = token
                ? req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                : req;
              return next.handle(retryReq);
            }),
            catchError(refreshError => {
              this.handleAuthFailure();
              return throwError(() => refreshError);
            }),
          );
        }

        // Keep it non-UI: log for now, UI can hook into this later if desired.
        console.error('HTTP error', {
          url: req.url,
          status: error.status,
          message: error.message,
        });

        return throwError(() => error);
      }),
    );
  }

  private handleAuthFailure(): void {
    this.authService.clearTokens();
    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }
}
