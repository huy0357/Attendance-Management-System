package org.example.ams_be.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserPrincipalTest {

    @Test
    void exposesIdentityAndSecurityFlags() {
        UserPrincipal principal = new UserPrincipal(7L, "alice", "manager");

        assertEquals(7L, principal.getEmployeeId());
        assertEquals("alice", principal.getUsername());
        assertEquals("manager", principal.getRole());
        assertEquals("", principal.getPassword());
        assertTrue(principal.isAccountNonExpired());
        assertTrue(principal.isAccountNonLocked());
        assertTrue(principal.isCredentialsNonExpired());
        assertTrue(principal.isEnabled());
        assertEquals(List.of(new SimpleGrantedAuthority("ROLE_MANAGER")), principal.getAuthorities());
    }
}
