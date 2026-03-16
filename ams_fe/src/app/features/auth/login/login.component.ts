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
  showPassword = false;
  isLoading = false;
  error = '';
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
  }

  submit(): void {
    this.error = '';
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

  demoLogin(): void {
    this.form.patchValue({ username: 'admin@amscore.com', password: 'demo123' });
    this.submit();
  }
}

