package com.kopruq.bridge.model;

/**
 * One independently replaceable part of a project's stored content. M1 has only the workspace; later milestones add
 * their sections to the {@code permits} list.
 */
public sealed interface ProjectSection permits ProjectWorkspace {
}
