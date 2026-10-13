package com.kopruq.bridge.api;

import java.time.Instant;
import java.util.UUID;

/** Body of a successful design-system {@code PUT}: the new revision and the stored value. */
public record SectionWriteResponse<T>(UUID projectId, long revision, Instant updatedAt, T value) {
}
