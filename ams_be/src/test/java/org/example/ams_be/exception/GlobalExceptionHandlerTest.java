package org.example.ams_be.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.core.MethodParameter;

import java.lang.reflect.Method;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFoundReturns404Body() {
        ResponseEntity<?> response = handler.handleNotFound(new NotFoundException("employee missing"));

        assertErrorResponse(response, HttpStatus.NOT_FOUND, "employee missing");
    }

    @Test
    void handleBadRequestReturns400Body() {
        ResponseEntity<?> response = handler.handleBadRequest(new IllegalArgumentException("bad input"));

        assertErrorResponse(response, HttpStatus.BAD_REQUEST, "bad input");
    }

    @Test
    void handleValidationReturns400BodyWithFieldErrors() throws Exception {
        SampleRequest request = new SampleRequest();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(request, "sampleRequest");
        bindingResult.addError(new FieldError("sampleRequest", "username", "must not be blank"));
        bindingResult.addError(new FieldError("sampleRequest", "password", "must have at least 8 chars"));

        Method method = SampleController.class.getDeclaredMethod("submit", SampleRequest.class);
        MethodParameter parameter = new MethodParameter(method, 0);
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter, bindingResult);

        ResponseEntity<?> response = handler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<String, Object> body = assertInstanceOf(Map.class, response.getBody());
        assertCommonBody(body, HttpStatus.BAD_REQUEST, "Validation failed");
        Map<String, String> errors = assertInstanceOf(Map.class, body.get("errors"));
        assertEquals("must not be blank", errors.get("username"));
        assertEquals("must have at least 8 chars", errors.get("password"));
    }

    @Test
    void handleOtherReturns500Body() {
        ResponseEntity<?> response = handler.handleOther(new RuntimeException("unexpected boom"));

        assertErrorResponse(response, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected boom");
    }

    @Test
    void exceptionClassesPreserveMessages() {
        assertEquals("bad", new BadRequestException("bad").getMessage());
        assertEquals("missing", new NotFoundException("missing").getMessage());
        assertEquals("gone", new ResourceNotFoundException("gone").getMessage());
    }

    private void assertErrorResponse(ResponseEntity<?> response, HttpStatus status, String message) {
        assertEquals(status, response.getStatusCode());
        Map<String, Object> body = assertInstanceOf(Map.class, response.getBody());
        assertCommonBody(body, status, message);
    }

    private void assertCommonBody(Map<String, Object> body, HttpStatus status, String message) {
        assertNotNull(body.get("timestamp"));
        assertEquals(status.value(), body.get("status"));
        assertEquals(status.getReasonPhrase(), body.get("error"));
        assertEquals(message, body.get("message"));
    }

    static class SampleController {
        void submit(SampleRequest request) {
        }
    }

    static class SampleRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
