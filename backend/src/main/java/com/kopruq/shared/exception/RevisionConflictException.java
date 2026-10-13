package com.kopruq.shared.exception;

/**
 * A write carried a stale revision (optimistic concurrency). Mapped to HTTP 409 {@code PROJECT_REVISION_CONFLICT}
 * by {@link ApiExceptionHandler}. Deliberately not an {@link IllegalArgumentException}, so it never turns into
 * {@code INVALID_INPUT}.
 */
public class RevisionConflictException extends RuntimeException {

    private final long expectedRevision;
    private final long currentRevision;

    public RevisionConflictException(long expectedRevision, long currentRevision) {
        super("Expected revision " + expectedRevision + " but the project is at revision " + currentRevision + ".");
        this.expectedRevision = expectedRevision;
        this.currentRevision = currentRevision;
    }

    public long expectedRevision() {
        return expectedRevision;
    }

    public long currentRevision() {
        return currentRevision;
    }
}
