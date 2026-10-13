package com.kopruq.bridge.application;

import com.kopruq.bridge.model.ProjectSection;

import java.util.UUID;

/** Storage port for the sections of a project's content (M1: the workspace). Joins the caller's transaction. */
public interface ProjectContentRepository {

    /** Loads every stored section of the project. */
    ProjectContent load(UUID projectId);

    /** Replaces the stored section with the given one (whole-section replacement). */
    void replace(UUID projectId, ProjectSection section);
}
