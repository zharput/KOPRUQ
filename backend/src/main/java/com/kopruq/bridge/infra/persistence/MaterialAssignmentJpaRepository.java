package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link MaterialAssignmentEntity}; used only by {@link DesignSystemContentStore}. */
interface MaterialAssignmentJpaRepository extends JpaRepository<MaterialAssignmentEntity, UUID> {

    List<MaterialAssignmentEntity> findByProjectIdOrderByOrdinalAsc(UUID projectId);

    /** Derived delete: loads and removes each row, so the element collections are removed too. */
    void deleteByProjectId(UUID projectId);
}
