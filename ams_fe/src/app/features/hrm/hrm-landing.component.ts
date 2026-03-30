import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-hrm-landing',
  template: '',
})
export class HrmLandingComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const target = this.authService.hasRole('ADMIN')
      ? '/hrm/employees'
      : this.authService.hasAnyRole(['HR', 'MANAGER'])
      ? '/hrm/departments'
      : '/hrm/employee-portal';

    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
