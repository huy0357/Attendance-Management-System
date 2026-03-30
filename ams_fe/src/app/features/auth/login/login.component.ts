import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private _authMode: 'login' | 'forgot' | 'verify' | 'reset' = 'login';
  get authMode() { return this._authMode; }
  set authMode(value: 'login' | 'forgot' | 'verify' | 'reset') {
    this._authMode = value;
    this.updateFormState();
  }
  showPassword = false;
  private _isLoading = false;
  get isLoading() { return this._isLoading; }
  set isLoading(value: boolean) {
    this._isLoading = value;
    this.updateFormState();
  }
  error = '';
  success = '';
  forgotEmail = '';
  verifiedOtp = '';
  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
    this.updateFormState();
  }

  private updateFormState(): void {
    if (!this.form) return;
    if (this._isLoading) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
      if (this._authMode === 'verify' || this._authMode === 'reset') {
        this.form.get('username')?.disable({ emitEvent: false });
      }
    }
  }

  submit(): void {
    if (this._isLoading) {
      return;
    }
    if (this.authMode !== 'login') {
      return;
    }
    this.error = '';
    this.success = '';
    if (this.form.invalid) {
      this.error = 'Please enter valid credentials';
      return;
    }

    this.isLoading = true;
    const { username, password } = this.form.value;
    this.authService.login({ username: username ?? '', password: password ?? '' }).subscribe({
      next: () => {
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.router.navigate(['/dashboard']);
        }, 0);
      },
      error: () => {
        setTimeout(() => {
          this.isLoading = false;
          this.error = 'Login failed. Please check your credentials.';
          this.cdr.markForCheck();
        }, 0);
      },
    });
  }

  openForgotPassword(): void {
    this.authMode = 'forgot';
    this.error = '';
    this.success = '';
    this.forgotEmail = (this.form.get('username')?.value ?? '').trim();
    this.verifiedOtp = '';
    this.form.patchValue({ password: '' });
  }

  backToLogin(): void {
    this.authMode = 'login';
    this.error = '';
    this.success = '';
    this.verifiedOtp = '';
    this.form.patchValue({ password: '' });
  }

  sendOtp(): void {
    const email = (this.form.get('username')?.value ?? '').trim();
    this.error = '';
    this.success = '';
    if (!email) {
      this.error = 'Please enter your email address.';
      return;
    }

    this.forgotEmail = email;
    this.isLoading = true;
    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = response.message;
        this.authMode = 'verify';
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.message || 'Unable to send OTP.';
      },
    });
  }

  verifyOtp(): void {
    const otp = (this.form.get('password')?.value ?? '').trim();
    this.error = '';
    this.success = '';
    if (!this.forgotEmail.trim() || !otp) {
      this.error = 'Please enter email and OTP.';
      return;
    }

    this.isLoading = true;
    this.authService.verifyOtp(this.forgotEmail.trim(), otp).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = response.message;
        this.verifiedOtp = otp;
        this.form.patchValue({ password: '' });
        this.authMode = 'reset';
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.message || 'OTP verification failed.';
      },
    });
  }

  resetPassword(): void {
    const newPassword = (this.form.get('password')?.value ?? '').trim();
    this.error = '';
    this.success = '';
    if (newPassword.length < 6) {
      this.error = 'New password must be at least 6 characters.';
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.forgotEmail.trim(), this.verifiedOtp, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = response.message;
        this.authMode = 'login';
        this.form.patchValue({ username: this.forgotEmail.trim(), password: '' });
        this.verifiedOtp = '';
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.message || 'Unable to reset password.';
      },
    });
  }
}

