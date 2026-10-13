package com.kopruq.bridge.application;

import com.kopruq.bridge.model.ProjectSection;

import java.util.UUID;

/**
 * Storage port for the sections of a project's content (the workspace, the design-system sections, the load inputs
 * and the graph documents). Joins the caller's transaction. A graph document is upserted by its id; every other
 * section is replaced whole.
 */
public interface ProjectContentRepository {

    /** Loads every stored section of the project. */
    ProjectContent load(UUID projectId);

    /** Replaces the stored section with the given one (whole-section replacement). */
    void replace(UUID projectId, ProjectSection section);
}
