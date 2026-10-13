package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link ProjectBridgeRowEntity}; used only by {@link JpaProjectContentRepository}. */
interface ProjectBridgeRowJpaRepository extends JpaRepository<ProjectBridgeRowEntity, UUID> {

    List<ProjectBridgeRowEntity> findByProjectIdOrderByOrdinalAsc(UUID projectId);

    /** Derived delete: loads and removes each row, so the element collections are removed too. */
    void deleteByProjectId(UUID projectId);
}
