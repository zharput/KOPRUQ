package com.kopruq.bridge.application;

import com.kopruq.bridge.model.ProjectWorkspace;

/** The stored sections of a project. {@code workspace} is null only for a project that has none stored yet. */
public record ProjectContent(ProjectWorkspace workspace) {
}
