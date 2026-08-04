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

                        // Admin only
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/employees/**").hasRole("ADMIN")
                        .requestMatchers("/api/accounts/**").hasRole("ADMIN")
                        .requestMatchers("/api/departments/**").hasRole("ADMIN")
                        .requestMatchers("/api/roles/**").hasRole("ADMIN")
                        .requestMatchers("/api/shift-templates/**").hasRole("ADMIN")
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")
                        .requestMatchers("/api/attendance-daily/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/attendance-daily/debug-run").hasRole("ADMIN")
                        .requestMatchers("/api/attendance-monthly-summary/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/employee-export/**").hasRole("ADMIN")
                        .requestMatchers("/api/attendance-export/**").hasRole("ADMIN")
                        .requestMatchers("/api/exports/**").hasRole("ADMIN")

                        // Manager and Admin
                        .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers("/api/requests/manager-queue/**").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/requests/*/approval").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers("/api/v1/dashboard/**").hasAnyRole("MANAGER", "ADMIN")

                        // Employee, Manager, Admin
                        .requestMatchers("/api/attendance-daily/employee/**").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")
                        .requestMatchers("/api/attendance-daily/me").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")
                        .requestMatchers("/api/requests/**").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")
                        .requestMatchers("/api/profile/**").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")
                        .requestMatchers("/api/employee-schedules/**").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")
                        .requestMatchers("/api/v1/schedules/**").hasAnyRole("EMPLOYEE", "MANAGER", "ADMIN")

                        // All authenticated users
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}