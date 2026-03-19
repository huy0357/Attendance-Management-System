package org.example.ams_be.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class JacksonConfigTest {

    @Test
    void objectMapperRegistersExpectedConfiguration() {
        ObjectMapper mapper = new JacksonConfig().objectMapper();

        assertNotNull(mapper);
        assertNotNull(mapper.findModules());
        assertFalse(mapper.isEnabled(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS));
    }
}
