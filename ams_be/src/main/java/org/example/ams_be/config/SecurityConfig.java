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
                // disable csrf (API dùng JWT)
                .csrf(csrf -> csrf.disable())

                // không dùng session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth

                        // ========================
                        // AUTH APIs
                        // ========================
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout"
                        ).permitAll()

                        // create account
                        .requestMatchers(HttpMethod.POST, "/api/accounts").permitAll()

                        // ========================
                        // ATTENDANCE APIs
                        // ========================

                        // admin xem toàn bộ bảng công
                        .requestMatchers("/api/attendance-daily/admin/**")
                        .hasRole("ADMIN")

                        // employee xem bảng công
                        .requestMatchers("/api/attendance-daily/employee/**")
                        .authenticated()

                        // batch attendance (admin)
                        .requestMatchers("/api/admin/attendance/**")
                        .hasRole("ADMIN")

                        // ========================
                        // ADMIN APIs
                        // ========================
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // ========================
                        // MANAGER APIs
                        // ========================
                        .requestMatchers("/api/manager/**")
                        .hasAnyRole("MANAGER", "ADMIN")

                        // ========================
                        // EMPLOYEE APIs
                        // ========================
                        .requestMatchers("/api/employees/**")
                        .hasAnyRole("EMPLOYEE", "ADMIN")

                        // error endpoint
                        .requestMatchers("/error").permitAll()

                        // các request còn lại cần login
                        .anyRequest().authenticated()
                )

                // JWT filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}