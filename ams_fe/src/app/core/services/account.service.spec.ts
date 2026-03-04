import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { PageResponse } from '../../shared/models/page-response.model';
import { AccountDto } from '../../shared/models/account.model';

describe('Dich vu tim kiem tai khoan', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;

  const taoAccount = (overrides: Partial<AccountDto> = {}): AccountDto => ({
    accountId: 1,
    employeeId: 10,
    username: 'admin',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    lastLoginAt: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('✅ g?i endpoint search và map ph?n t? d?u tiên khi có d? li?u', () => {
    service.findByUsername('admin').subscribe((account) => {
      expect(account?.username).toBe('admin');
    });

    const req = httpMock.expectOne((request) => request.url === '/api/accounts/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('username')).toBe('admin');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('1');
    expect(req.request.params.get('sortBy')).toBe('accountId');
    expect(req.request.params.get('sortDir')).toBe('desc');

    const response: PageResponse<AccountDto> = {
      items: [taoAccount()],
      page: 1,
      size: 1,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    req.flush(response);
  });

  it('✅ tr? v? null khi API search không có k?t qu?', () => {
    service.findByUsername('khong-ton-tai').subscribe((account) => {
      expect(account).toBeNull();
    });

    const req = httpMock.expectOne('/api/accounts/search?username=khong-ton-tai&page=1&size=1&sortBy=accountId&sortDir=desc');
    req.flush({
      items: [],
      page: 1,
      size: 1,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('✅ tr? v? null khi response không có tru?ng items', () => {
    service.findByUsername('admin').subscribe((account) => {
      expect(account).toBeNull();
    });

    const req = httpMock.expectOne('/api/accounts/search?username=admin&page=1&size=1&sortBy=accountId&sortDir=desc');
    req.flush({});
  });

  it('✅ chuy?n ti?p l?i 401 t? backend v? caller', () => {
    let status = 0;

    service.findByUsername('admin').subscribe({
      error: (error) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/accounts/search?username=admin&page=1&size=1&sortBy=accountId&sortDir=desc');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });
});



