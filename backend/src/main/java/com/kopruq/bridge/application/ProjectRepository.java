package com.kopruq.bridge.application;

import com.kopruq.bridge.model.Project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Storage port for the {@link Project} aggregate (bridge, design space and generated alternatives) and its revision.
 * The production adapter is {@code com.kopruq.bridge.infra.persistence.JpaProjectRepository}. Computed results (rule
 * results, layouts, loads, analysis) are not part of what is stored. The workspace content is stored through
 * {@link ProjectContentRepository}.
 */
public interface ProjectRepository {

    /** Inserts the project, or updates the stored one with the same id so that it equals the given state. */
    Project save(Project project);

    Optional<Project> findById(UUID id);

    /** Like {@link #findById} but takes a write lock held until the surrounding transaction ends. */
    Optional<Project> findByIdForUpdate(UUID id);

    /** One summary per stored project, in no particular order. */
    List<ProjectSummary> findSummaries();

    /** Removes the project aggregate (bridge, design space, alternatives); no-op when the id is unknown. */
    void delete(UUID id);
}
