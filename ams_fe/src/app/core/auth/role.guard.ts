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

        const userRole = this.authService.getRole();

        // If user has no role, deny access
        if (!userRole) {
            this.router.navigate(['/dashboard']);
            return false;
        }

        // Normalize role comparison (case-insensitive)
        const normalizedUserRole = userRole.toUpperCase().replace('ROLE_', '');
        const hasRequiredRole = requiredRoles.some(role =>
            role.toUpperCase().replace('ROLE_', '') === normalizedUserRole
        );

        if (hasRequiredRole) {
            return true;
        }

        // Redirect to dashboard if access denied
        this.router.navigate(['/dashboard']);
        return false;
    }
}
