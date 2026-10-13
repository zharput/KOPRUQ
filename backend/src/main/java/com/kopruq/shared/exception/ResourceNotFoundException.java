package com.kopruq.shared.exception;

/**
 * A requested resource does not exist. Mapped to HTTP 404 by {@link ApiExceptionHandler} with the machine-readable
 * {@link #code()} given by the thrower (for example {@code PROJECT_NOT_FOUND}).
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String code;

    public ResourceNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
