package org.example.ams_be.config;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/verify-otp",
                                "/api/auth/reset-password"
                        ).permitAll()

                        .requestMatchers("/error").permitAll()

                        // System Admin only (Account & Role Management)
                        .requestMatchers("/api/admin/**", "/api/accounts/**", "/api/roles/**").hasRole("ADMIN")

                        // HR and Admin
                        .requestMatchers("/api/audit-logs/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers("/api/attendance-email/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers("/api/attendance-daily/debug-run").hasAnyRole("ADMIN", "HR")
                        .requestMatchers("/api/employee-export/**", "/api/attendance-export/**", "/api/exports/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers(HttpMethod.POST, "/api/employees/**", "/api/departments/**", "/api/v1/shifts/**", "/api/monthly-summary/generate").hasAnyRole("ADMIN", "HR")
                        .requestMatchers(HttpMethod.PUT, "/api/employees/**", "/api/departments/**", "/api/v1/shifts/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/shifts/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers(HttpMethod.DELETE, "/api/employees/**", "/api/departments/**", "/api/v1/shifts/**").hasAnyRole("ADMIN", "HR")

                        // Dashboard, Manager Queue, Approval, Scheduling, Attendance Admin: Admin, HR, Manager
                        .requestMatchers("/api/v1/dashboard/**").hasAnyRole("MANAGER", "ADMIN", "HR")
                        .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "ADMIN", "HR")
                        .requestMatchers("/api/requests/manager-queue/**").hasAnyRole("MANAGER", "ADMIN", "HR")
                        .requestMatchers(HttpMethod.PUT, "/api/requests/*/approval").hasAnyRole("MANAGER", "ADMIN", "HR")
                        .requestMatchers("/api/attendance-daily/admin/**").hasAnyRole("MANAGER", "ADMIN", "HR")
                        .requestMatchers("/api/monthly-summary/admin/**", "/api/attendance-monthly-summary/admin/**").hasAnyRole("MANAGER", "ADMIN", "HR")

                        // All Authenticated Users (Employee, Manager, HR, Admin): Read Employees/Departments/Shifts, My Attendance, My Requests, My Profile, Schedules
                        .requestMatchers(HttpMethod.GET, "/api/employees/**", "/api/departments/**", "/api/v1/shifts/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")
                        .requestMatchers("/api/attendance-daily/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")
                        .requestMatchers("/api/monthly-summary/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")
                        .requestMatchers("/api/requests/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")
                        .requestMatchers("/api/profile/**", "/api/v1/profile/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")
                        .requestMatchers("/api/employee-schedules/**", "/api/v1/schedules/**").hasAnyRole("EMPLOYEE", "MANAGER", "HR", "ADMIN")

                        // All authenticated users
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}