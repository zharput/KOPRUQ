package com.kopruq.bridge.application;

import com.kopruq.bridge.model.ProjectWorkspace;

import java.time.Instant;
import java.util.UUID;

/** A project as read: identity, revision and its stored content. */
public record ProjectDocument(UUID projectId, long revision, Instant createdUtc, Instant updatedUtc,
        ProjectWorkspace workspace) {
}
