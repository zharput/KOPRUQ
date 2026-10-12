package com.kopruq.api.error;

import java.time.Instant;
import java.util.List;

/**
 * The one JSON error body of the API: a superset of the Spring Boot default
 * error body ({@code timestamp, status, error, message, path}) plus a
 * stable machine-readable {@code code}, the request correlation id and the
 * per-field {@code errors}. The {@code message} key is kept because the
 * frontend reads it.
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        String correlationId,
        List<FieldViolation> errors) {
}
