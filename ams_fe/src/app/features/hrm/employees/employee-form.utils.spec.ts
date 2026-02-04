import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { mapBackendErrorsToForm } from './employee-form.utils';

describe('mapBackendErrorsToForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
    });
  });

  it('should map fieldErrors to form controls', () => {
    const form = new FormGroup({
      email: new FormControl(''),
      phone: new FormControl(''),
    });

    const error = {
      error: {
        fieldErrors: {
          email: ['Email khong dung dinh dang'],
          phone: 'So dien thoai khong hop le',
        },
      },
    };

    const message = mapBackendErrorsToForm(form, error);
    expect(message).toBeNull();
    expect(form.get('email')?.errors?.['backend']).toBe('Email khong dung dinh dang');
    expect(form.get('phone')?.errors?.['backend']).toBe('So dien thoai khong hop le');
  });

  it('should map errors array to form controls and return message', () => {
    const form = new FormGroup({
      email: new FormControl(''),
    });

    const error = {
      error: {
        message: 'Validation failed',
        errors: [{ field: 'email', defaultMessage: 'Email khong dung dinh dang' }],
      },
    };

    const message = mapBackendErrorsToForm(form, error);
    expect(message).toBe('Validation failed');
    expect(form.get('email')?.errors?.['backend']).toBe('Email khong dung dinh dang');
  });
});
