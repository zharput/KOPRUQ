package com.kopruq.api.error;

/** One rejected request field: its JSON name and why it was rejected. */
public record FieldViolation(String field, String message) {
}
