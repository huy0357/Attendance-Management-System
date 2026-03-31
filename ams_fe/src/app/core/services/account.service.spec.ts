import { TestBed } from '@angular/core/testing';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountService],
    });

    service = TestBed.inject(AccountService);
  });

  it('creates the service instance', () => {
    expect(service).toBeTruthy();
  });
});
