package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link BridgeDefinitionEntity}; used only by {@link DesignSystemContentStore}. */
interface BridgeDefinitionJpaRepository extends JpaRepository<BridgeDefinitionEntity, UUID> {

    List<BridgeDefinitionEntity> findByProjectIdOrderByOrdinalAsc(UUID projectId);

    /** Derived delete: loads and removes each row, so the element collections are removed too. */
    void deleteByProjectId(UUID projectId);
}
