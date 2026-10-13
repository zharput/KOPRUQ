package com.kopruq.bridge.api;

import java.time.Instant;
import java.util.UUID;

/** Body of a successful {@code PUT /api/projects/{projectId}/workspace}: the new revision and the stored value. */
public record WorkspaceWriteResponse(UUID projectId, long revision, Instant updatedAt, WorkspaceDto value) {
}
