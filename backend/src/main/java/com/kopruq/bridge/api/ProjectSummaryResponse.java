package com.kopruq.bridge.api;

import com.kopruq.bridge.application.ProjectSummary;

import java.time.Instant;
import java.util.UUID;

/** One entry of {@code GET /api/projects}. */
public record ProjectSummaryResponse(UUID projectId, String name, long revision, Instant createdAt,
        Instant updatedAt) {

    static ProjectSummaryResponse from(ProjectSummary s) {
        return new ProjectSummaryResponse(s.projectId(), s.name(), s.revision(), s.createdUtc(), s.updatedUtc());
    }
}
