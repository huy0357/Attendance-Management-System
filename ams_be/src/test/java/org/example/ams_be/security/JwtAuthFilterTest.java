package org.example.ams_be.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import org.example.ams_be.utils.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private FilterChain filterChain;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternalSkipsWhenAuthorizationHeaderMissing() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);

        filter.doFilterInternal(new MockHttpServletRequest(), new MockHttpServletResponse(), filterChain);

        verifyNoInteractions(jwtUtil);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternalSkipsWhenAuthorizationHeaderIsNotBearer() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Basic abc");

        filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);

        verifyNoInteractions(jwtUtil);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternalSwallowsJwtExceptionAndLeavesContextEmpty() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer broken-token");
        doThrow(new JwtException("bad token")).when(jwtUtil).isExpired("broken-token");

        filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);

        verify(jwtUtil).isExpired("broken-token");
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternalSkipsExpiredToken() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer expired-token");
        when(jwtUtil.isExpired("expired-token")).thenReturn(true);

        filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);

        verify(jwtUtil).isExpired("expired-token");
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternalSkipsNonAccessToken() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer refresh-token");
        when(jwtUtil.isExpired("refresh-token")).thenReturn(false);
        when(jwtUtil.getType("refresh-token")).thenReturn("refresh");

        filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);

        verify(jwtUtil).getType("refresh-token");
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilterInternalSetsSecurityContextForValidAccessToken() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");
        when(jwtUtil.isExpired("valid-token")).thenReturn(false);
        when(jwtUtil.getType("valid-token")).thenReturn("access");
        when(jwtUtil.getEmployeeId("valid-token")).thenReturn(42L);
        when(jwtUtil.getUsername("valid-token")).thenReturn("alice");
        when(jwtUtil.getRole("valid-token")).thenReturn("ADMIN");

        filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);

        UsernamePasswordAuthenticationToken authentication = assertInstanceOf(
                UsernamePasswordAuthenticationToken.class,
                SecurityContextHolder.getContext().getAuthentication()
        );
        UserPrincipal principal = assertInstanceOf(UserPrincipal.class, authentication.getPrincipal());
        assertEquals(42L, principal.getEmployeeId());
        assertEquals("alice", principal.getUsername());
        assertEquals("ADMIN", principal.getRole());
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
