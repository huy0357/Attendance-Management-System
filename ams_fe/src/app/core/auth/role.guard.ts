import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        const requiredRoles = route.data['roles'] as string[] | undefined;

        // If no roles required, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const userRole = this.authService.getNormalizedRole();

        // If user has no role, deny access
        if (!userRole) {
            this.router.navigate(['/dashboard']);
            return false;
        }

        // Normalize role comparison (case-insensitive)
        const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);

        if (hasRequiredRole) {
            return true;
        }

        // Redirect to dashboard if access denied
        this.router.navigate(['/dashboard']);
        return false;
    }
}
