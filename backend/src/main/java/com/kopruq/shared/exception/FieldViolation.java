package com.kopruq.shared.exception;

/** One rejected request field: its JSON name and why it was rejected. */
public record FieldViolation(String field, String message) {
}
