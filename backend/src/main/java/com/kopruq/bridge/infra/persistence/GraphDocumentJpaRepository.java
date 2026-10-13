package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data access to {@link GraphDocumentEntity}; used only by {@link GraphContentStore}. */
interface GraphDocumentJpaRepository extends JpaRepository<GraphDocumentEntity, UUID> {

    List<GraphDocumentEntity> findByProjectIdOrderByOrdinalAsc(UUID projectId);

    Optional<GraphDocumentEntity> findByProjectIdAndGraphId(UUID projectId, String graphId);

    /** The highest ordinal of the project's graphs, or -1 when it has none. */
    @Query("select coalesce(max(g.ordinal), -1) from GraphDocumentEntity g where g.projectId = :projectId")
    int maxOrdinal(@Param("projectId") UUID projectId);
}
