import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Animated Background Elements -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <!-- Main Content -->
      <div class="relative z-10 max-w-md w-full">
        <!-- Logo/Header Section -->
        <div class="text-center mb-8">
          <div class="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300">
            <svg class="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p class="text-gray-600 text-lg">Sign in to your Attendance Management System</p>
        </div>

        <!-- Login Form Card -->
        <div class="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 border border-blue-100 transform hover:shadow-3xl transition-shadow duration-300">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Username Field -->
            <div class="space-y-2">
              <label for="username" class="block text-sm font-semibold text-gray-700">
                Username
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  formControlName="username"
                  autocomplete="username"
                  class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 hover:border-blue-400"
                  placeholder="Enter your username"
                  [class.border-red-300]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
                  [class.focus:ring-red-500]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
                  [class.focus:border-red-500]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" />
              </div>
              <div
                *ngIf="loginForm.get('username')?.invalid && (loginForm.get('username')?.touched || submitted)"
                class="flex items-center text-red-600 text-sm animate-fade-in">
                <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Please enter your username
              </div>
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <label for="password" class="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 hover:border-blue-400"
                  placeholder="Enter your password"
                  [class.border-red-300]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  [class.focus:ring-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  [class.focus:border-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 transition-colors group-focus-within:text-blue-500">
                  <svg *ngIf="!showPassword()" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg *ngIf="showPassword()" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
              <div
                *ngIf="loginForm.get('password')?.invalid && (loginForm.get('password')?.touched || submitted)"
                class="flex items-center text-red-600 text-sm animate-fade-in">
                <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Please enter your password
              </div>
            </div>

            <!-- Error Message -->
            <div
              *ngIf="errorMessage()"
              class="rounded-lg bg-red-50 border border-red-200 p-4 animate-slide-down">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-red-800">{{ errorMessage() }}</p>
                </div>
              </div>
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label for="remember-me" class="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div class="text-sm">
                <a href="#" class="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="isSubmitDisabled()"
              class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 transform hover:scale-[1.02] active:scale-[0.98]">
              <span *ngIf="!loading()" class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                Sign In
              </span>
              <span *ngIf="loading()" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            </button>
          </form>

          <!-- Footer -->
          <div class="mt-6 text-center">
            <p class="text-xs text-gray-500">
              © 2024 Attendance Management System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slide-down {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }

    .animate-slide-down {
      animation: slide-down 0.3s ease-out;
    }

    .animation-delay-2000 {
      animation-delay: 2s;
    }

    .animation-delay-4000 {
      animation-delay: 4s;
    }

    .hover\\:shadow-3xl:hover {
      box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
    }

    .transform {
      transition: all 0.3s ease;
    }

    .group:focus-within .group-focus-within\\:text-blue-500 {
      color: rgb(59 130 246);
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string>('');
  showPassword = signal(false);
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  private get usernameControl() {
    return this.loginForm.get('username');
  }

  private get passwordControl() {
    return this.loginForm.get('password');
  }

  isSubmitDisabled(): boolean {
    const username = this.usernameControl?.value;
    const password = this.passwordControl?.value;
    const hasUsername = typeof username === 'string' && username.trim().length > 0;
    const hasPassword = typeof password === 'string' && password.trim().length > 0;
    return this.loading() || !hasUsername || !hasPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.loading.set(false);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (error) => {
          this.loading.set(false);
          console.error('Login error:', error);
          // status 0 = request blocked (CORS) or cannot connect to server
          if (error.status === 0) {
            this.errorMessage.set('Unable to connect to server');
          } else if (error.status === 401) {
            this.errorMessage.set('Invalid username or password');
          } else if (error.status === 403) {
            this.errorMessage.set('Your account has been disabled');
          } else if (error.status >= 500 || !error.status) {
            this.errorMessage.set('An error occurred. Please try again later.');
          } else if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else {
            this.errorMessage.set('An error occurred. Please try again later.');
          }
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}
