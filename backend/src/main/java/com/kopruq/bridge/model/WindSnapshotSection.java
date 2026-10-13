package com.kopruq.bridge.model;

/** The wind-snapshot section; null {@code snapshot} means "cleared / not set". */
public record WindSnapshotSection(WindSnapshot snapshot) implements ProjectSection {
}
