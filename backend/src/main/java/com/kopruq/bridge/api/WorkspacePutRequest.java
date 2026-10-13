package com.kopruq.bridge.api;

/** Body of {@code PUT /api/projects/{projectId}/workspace}: the revision the client last saw, and the new content. */
public record WorkspacePutRequest(Long expectedRevision, WorkspaceDto value) {
}
