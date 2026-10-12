package com.kopruq.shared.exception;

import java.util.List;

/**
 * A request failed validation; carries every violation found (not just the
 * first) so the client can show all of them at once. Mapped to HTTP 400
 * with code {@code INVALID_REQUEST} by {@link ApiExceptionHandler}.
 *
 * <p>It extends {@link IllegalArgumentException} so a caller that is not
 * behind the web layer still treats it as plain invalid input.
 */
public class InvalidRequestException extends IllegalArgumentException {

    private final List<FieldViolation> violations;

    public InvalidRequestException(List<FieldViolation> violations) {
        super(summarize(violations));
        this.violations = List.copyOf(violations);
    }

    public List<FieldViolation> violations() {
        return violations;
    }

    private static String summarize(List<FieldViolation> violations) {
        if (violations == null || violations.isEmpty()) {
            return "Invalid request";
        }
        StringBuilder sb = new StringBuilder("Invalid request: ");
        for (int i = 0; i < violations.size(); i++) {
            if (i > 0) {
                sb.append("; ");
            }
            sb.append(violations.get(i).field()).append(" ").append(violations.get(i).message());
        }
        return sb.toString();
    }
}
