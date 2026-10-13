package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Spring Data access to {@link TrafficLm1FactorEntity}; used only by {@link LoadInputContentStore}. */
interface TrafficLm1FactorJpaRepository extends JpaRepository<TrafficLm1FactorEntity, UUID> {

    /** Rows of the project; the caller groups them and orders each group by index. */
    List<TrafficLm1FactorEntity> findByProjectIdOrderByFactorIndexAsc(UUID projectId);

    void deleteByProjectId(UUID projectId);
}
