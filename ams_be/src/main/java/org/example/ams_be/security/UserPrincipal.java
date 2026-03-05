package org.example.ams_be.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    private final Long employeeId;   // thêm
    private final String username;
    private final String role;

    public UserPrincipal(Long employeeId, String username, String role) {
        this.employeeId = employeeId;
        this.username = username;
        this.role = role;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public String getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {

        // Spring Security role format
        String normalized = "ROLE_" + role.toUpperCase();

        return List.of(new SimpleGrantedAuthority(normalized));
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override public boolean isAccountNonExpired() { return true; }

    @Override public boolean isAccountNonLocked() { return true; }

    @Override public boolean isCredentialsNonExpired() { return true; }

    @Override public boolean isEnabled() { return true; }
}