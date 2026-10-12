package com.kopruq.api.error;

import com.kopruq.landxml.LandXmlParseException;
import com.kopruq.api.observability.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;

/**
 * Single place that turns exceptions into {@link ApiErrorResponse}.
 *
 * <ul>
 *   <li>Spring web exceptions (anything implementing {@link ErrorResponse}:
 *       404/405/415, missing parameter or part ...) keep their status;
 *       {@link ResponseStatusException} keeps its reason verbatim as
 *       {@code message}.</li>
 *   <li>{@link IllegalArgumentException} (including {@code NumberFormatException})
 *       is 400 {@code INVALID_INPUT}, message verbatim.</li>
 *   <li>Anything unexpected is 500 {@code INTERNAL_ERROR} with a generic
 *       message; the exception text never reaches the client.</li>
 * </ul>
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    static final String GENERIC_INTERNAL_MESSAGE = "An internal error occurred.";

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(InvalidRequestException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "INVALID_REQUEST", ex.getMessage(), request, ex.violations());
    }

    @ExceptionHandler(LandXmlParseException.class)
    public ResponseEntity<ApiErrorResponse> handleLandXmlParse(LandXmlParseException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "INVALID_LANDXML", ex.getMessage(), request, List.of());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "INVALID_INPUT", ex.getMessage(), request, List.of());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST_BODY", "The request body is missing or malformed.", request, List.of());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
                "Parameter '" + ex.getName() + "' has an invalid value.", request, List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleUploadTooLarge(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.PAYLOAD_TOO_LARGE, "UPLOAD_TOO_LARGE", "The uploaded file is too large.", request, List.of());
    }

    @ExceptionHandler(UncheckedIOException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableUpload(UncheckedIOException ex, HttpServletRequest request) {
        return build(ex, HttpStatus.BAD_REQUEST, "UPLOAD_UNREADABLE", "The uploaded file could not be read.", request, List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleAny(Exception ex, HttpServletRequest request) {
        if (ex instanceof ResponseStatusException rse) {
            String reason = rse.getReason() != null ? rse.getReason() : reasonPhrase(rse.getStatusCode());
            return build(ex, rse.getStatusCode(), codeFor(rse.getStatusCode()), reason, request, List.of());
        }
        if (ex instanceof ErrorResponse er) {
            return build(ex, er.getStatusCode(), codeFor(er.getStatusCode()), reasonPhrase(er.getStatusCode()), request, List.of());
        }
        return build(ex, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", GENERIC_INTERNAL_MESSAGE, request, List.of());
    }

    private ResponseEntity<ApiErrorResponse> build(Exception ex, HttpStatusCode status, String code, String message,
            HttpServletRequest request, List<FieldViolation> violations) {
        if (status.is5xxServerError()) {
            log.error("{} {} failed with {} ({})", request.getMethod(), request.getRequestURI(), status.value(), code, ex);
        } else {
            log.info("{} {} rejected with {} ({}): {}", request.getMethod(), request.getRequestURI(), status.value(), code, ex.getMessage());
            log.debug("Rejected request detail", ex);
        }
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(), status.value(), reasonPhrase(status), code, message,
                request.getRequestURI(), MDC.get(CorrelationIdFilter.MDC_KEY), violations);
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private static String reasonPhrase(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.getReasonPhrase() : "Error";
    }

    private static String codeFor(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.name() : "HTTP_" + status.value();
    }
}
