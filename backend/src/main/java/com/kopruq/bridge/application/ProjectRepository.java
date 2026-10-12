package com.kopruq.bridge.application;

import com.kopruq.bridge.model.Project;

import java.util.Optional;
import java.util.UUID;

/**
 * Storage port for the {@link Project} aggregate (bridge, design space and generated alternatives). The production
 * adapter is {@code com.kopruq.bridge.infra.persistence.JpaProjectRepository}. Computed results (rule results,
 * layouts, loads, analysis) are not part of what is stored.
 */
public interface ProjectRepository {

    /** Inserts the project, or updates the stored one with the same id so that it equals the given state. */
    Project save(Project project);

    Optional<Project> findById(UUID id);
}
