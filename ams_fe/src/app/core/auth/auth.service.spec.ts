import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthResponse } from './auth.service';

describe('Dich vu xac thuc', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const taoToken = (expUnixSeconds: number): string => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: expUnixSeconds }));
    return `${header}.${payload}.sig`;
  };

  const taoAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
    accessToken: taoToken(Math.floor(Date.now() / 1000) + 3600),
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    expiresInSeconds: 3600,
    username: 'admin',
    role: 'ADMIN',
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('✅ goi API login va luu access refresh token vao localStorage', () => {
    service.login({ username: 'admin', password: '123456' }).subscribe((response) => {
      expect(response.username).toBe('admin');
      expect(service.getAccessToken()).toBeTruthy();
      expect(service.getRefreshToken()).toBe('refresh-token');
      expect(service.getRole()).toBe('ADMIN');
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'admin', password: '123456' });
    req.flush(taoAuthResponse());
  });

  it('✅ tra loi khi refresh token bi thieu', async () => {
    await expect(firstValueFrom(service.refreshTokens())).rejects.toThrow('Missing refresh token');
  });

  it('✅ chi goi mot request refresh cho nhieu subscriber dong thoi', () => {
    localStorage.setItem('ams.refreshToken', 'r1');

    const ketQua: string[] = [];
    service.refreshTokens().subscribe((res) => ketQua.push(res.accessToken));
    service.refreshTokens().subscribe((res) => ketQua.push(res.accessToken));

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'r1' });

    req.flush(taoAuthResponse({ accessToken: 'new-access' }));

    expect(ketQua).toEqual(['new-access', 'new-access']);
  });

  it('✅ logout khong goi API khi khong co refresh token nhung van clear session', () => {
    localStorage.setItem('ams.accessToken', 'a');
    localStorage.setItem('ams.username', 'u');

    service.logout().subscribe();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getUsername()).toBeNull();
    httpMock.expectNone('/api/auth/logout');
  });

  it('✅ logout goi API /auth/logout khi co refresh token', () => {
    localStorage.setItem('ams.refreshToken', 'rrr');

    service.logout().subscribe();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'rrr' });
    req.flush(null);
  });

  it('✅ xac dinh chinh xac trang thai het han access token', () => {
    const daHetHan = taoToken(Math.floor(Date.now() / 1000) - 10);
    localStorage.setItem('ams.accessToken', daHetHan);
    localStorage.setItem('ams.refreshToken', 'rrr');

    expect(service.isAccessTokenExpired()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('✅ nhan dien auth endpoint theo quy tac /api/auth/', () => {
    expect(service.isAuthEndpoint('/api/auth/login')).toBe(true);
    expect(service.isAuthEndpoint('/api/employees')).toBe(false);
  });
});


