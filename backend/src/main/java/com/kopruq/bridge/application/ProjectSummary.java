package com.kopruq.bridge.application;

import java.time.Instant;
import java.util.UUID;

/** List entry of a stored project. */
public record ProjectSummary(UUID projectId, String name, long revision, Instant createdUtc, Instant updatedUtc) {
}
