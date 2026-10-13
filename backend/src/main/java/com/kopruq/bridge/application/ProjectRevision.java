package com.kopruq.bridge.application;

import java.time.Instant;
import java.util.UUID;

/** The revision a project reached after an accepted write. */
public record ProjectRevision(UUID projectId, long revision, Instant updatedUtc) {
}
