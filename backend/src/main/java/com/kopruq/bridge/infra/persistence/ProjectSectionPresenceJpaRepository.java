package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link ProjectSectionPresenceEntity}; used by {@link DesignSystemContentStore} and {@link LoadInputContentStore}. */
interface ProjectSectionPresenceJpaRepository extends JpaRepository<ProjectSectionPresenceEntity, UUID> {

    List<ProjectSectionPresenceEntity> findByProjectId(UUID projectId);

    boolean existsByProjectIdAndSection(UUID projectId, StoredSection section);

    void deleteByProjectId(UUID projectId);

    void deleteByProjectIdAndSection(UUID projectId, StoredSection section);
}
