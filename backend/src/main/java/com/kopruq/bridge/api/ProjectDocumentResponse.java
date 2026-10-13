package com.kopruq.bridge.api;

import com.kopruq.bridge.application.ProjectDocument;

import java.time.Instant;
import java.util.UUID;

/** Body of {@code POST /api/projects} (201) and {@code GET /api/projects/{projectId}}. {@code workspace} is null only for a project that has none stored yet. */
public record ProjectDocumentResponse(UUID projectId, long revision, Instant createdAt, Instant updatedAt,
        WorkspaceDto workspace) {

    static ProjectDocumentResponse from(ProjectDocument d) {
        return new ProjectDocumentResponse(d.projectId(), d.revision(), d.createdUtc(), d.updatedUtc(),
                d.workspace() == null ? null : ProjectWorkspaceMapper.toDto(d.workspace()));
    }
}
