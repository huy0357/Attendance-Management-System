package org.example.ams_be.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityBeansTest {

    @Test
    void passwordEncoderCreatesWorkingBCryptEncoder() {
        PasswordEncoder encoder = new SecurityBeans().passwordEncoder();

        String encoded = encoder.encode("secret");
        assertNotEquals("secret", encoded);
        assertTrue(encoder.matches("secret", encoded));
    }
}
