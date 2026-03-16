import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorInterceptor } from './http-error.interceptor';
import { AuthService } from './auth.service';

class AuthServiceStub {
  refreshToken: string | null = 'r1';
  accessToken: string | null = 'new-token';
  clearTokens = vi.fn();
  refreshTokens = vi.fn(() => of({}));

  isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/');
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

class RouterStub {
  url = '/dashboard';
  navigate = vi.fn(async () => true);
}

describe('Interceptor xu ly loi HTTP', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthServiceStub;
  let router: RouterStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: Router, useClass: RouterStub },
        { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router) as unknown as RouterStub;
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('✅ gặp 401 thì refresh token và retry request với Authorization mới', () => {
    const ketQua: unknown[] = [];

    http.get('/api/secure-data').subscribe((res) => {
      ketQua.push(res);
    });

    const req1 = httpMock.expectOne('/api/secure-data');
    req1.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshTokens).toHaveBeenCalledTimes(1);

    const req2 = httpMock.expectOne('/api/secure-data');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
    req2.flush({ ok: true });

    expect(ketQua).toEqual([{ ok: true }]);
  });

  it('✅ gặp 401 nhưng không có refresh token thì clear token và điều hướng login', () => {
    authService.refreshToken = null;
    let status: number | undefined;

    http.get('/api/secure-data').subscribe({
      error: (error: { status?: number }) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/secure-data');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.clearTokens).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(status).toBe(401);
  });

  it('✅ refresh thất bại thì clear token, điều hướng login và trả lỗi refresh', () => {
    authService.refreshTokens = vi.fn(() => throwError(() => new Error('refresh-failed')));
    let thongDiep = '';

    http.get('/api/secure-data').subscribe({
      error: (error: Error) => {
        thongDiep = String(error.message);
      },
    });

    const req = httpMock.expectOne('/api/secure-data');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.clearTokens).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(thongDiep).toContain('refresh-failed');
  });

  it('✅ lỗi 403 không auto logout và không điều hướng login', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let status: number | undefined;

    http.get('/api/secure-data').subscribe({
      error: (error: { status?: number }) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/secure-data');
    req.flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(authService.refreshTokens).not.toHaveBeenCalled();
    expect(authService.clearTokens).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    expect(status).toBe(403);
  });

  it('✅ không refresh cho endpoint auth dù trả về 401', () => {
    let status: number | undefined;

    http.get('/api/auth/me').subscribe({
      error: (error: { status?: number }) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/auth/me');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshTokens).not.toHaveBeenCalled();
    expect(status).toBe(401);
  });
});


