import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-attendance-landing',
  template: '',
})
export class AttendanceLandingComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const target = this.authService.hasRole('ADMIN')
      ? '/attendance/attendance-daily/admin'
      : '/attendance/attendance-daily';

    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
