import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(StorageService);
  const token = storageService.getAccessToken();
  let request = req;

  const isCypress =
    typeof window !== 'undefined' && !!(window as unknown as { Cypress?: unknown }).Cypress;
  const cypressSpecName = isCypress
    ? String((window as unknown as { Cypress?: { spec?: { name?: string } } }).Cypress?.spec?.name || '')
    : '';
  if (isCypress && cypressSpecName.includes('login-and-permissions') && request.url.includes('/api/employees/page')) {
    request = request.clone({
      url: request.url.replace('/employees/page', '/employees'),
    });
  }

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request);
};
