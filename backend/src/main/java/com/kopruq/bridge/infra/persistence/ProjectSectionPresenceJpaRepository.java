package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link ProjectSectionPresenceEntity}; used only by {@link DesignSystemContentStore}. */
interface ProjectSectionPresenceJpaRepository extends JpaRepository<ProjectSectionPresenceEntity, UUID> {

    List<ProjectSectionPresenceEntity> findByProjectId(UUID projectId);

    boolean existsByProjectIdAndSection(UUID projectId, StoredSection section);

    void deleteByProjectIdAndSection(UUID projectId, StoredSection section);
}
