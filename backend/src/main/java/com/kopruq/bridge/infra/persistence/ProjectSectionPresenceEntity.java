package com.kopruq.bridge.infra.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** A row says "this list section was written for the project" (so an empty list differs from a never-written one). */
@Entity
@Table(name = "project_section_presence")
class ProjectSectionPresenceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_key", nullable = false, length = 40)
    private StoredSection section;

    protected ProjectSectionPresenceEntity() {
    }

    ProjectSectionPresenceEntity(UUID projectId, StoredSection section) {
        this.projectId = projectId;
        this.section = section;
    }

    StoredSection getSection() {
        return section;
    }
}
