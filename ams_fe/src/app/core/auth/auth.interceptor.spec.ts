import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

class AuthServiceStub {
  token: string | null = null;

  isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/');
  }

  getAccessToken(): string | null {
    return this.token;
  }
}

describe('Interceptor them token xac thuc', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('✅ thêm Authorization header cho request không ph?i auth endpoint khi có token', () => {
    authService.token = 'abc-token';

    http.get('/api/employees').subscribe();

    const req = httpMock.expectOne('/api/employees');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc-token');
    req.flush([]);
  });

  it('✅ không thêm Authorization header cho endpoint /api/auth/*', () => {
    authService.token = 'abc-token';

    http.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('✅ gi? nguyên request khi không có token', () => {
    authService.token = null;

    http.get('/api/departments').subscribe();

    const req = httpMock.expectOne('/api/departments');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });
});



