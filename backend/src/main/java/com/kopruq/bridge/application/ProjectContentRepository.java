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

    /** Removes every stored section and row of the project (workspace, design system, loads, graphs). */
    void deleteAll(UUID projectId);

    /** True when any stored project still names the terrain dataset in its workspace environment. */
    boolean isTerrainReferenced(String terrainId);

    /** True when any stored project still names the LandXML import in its workspace environment. */
    boolean isLandXmlImportReferenced(String importId);
}
