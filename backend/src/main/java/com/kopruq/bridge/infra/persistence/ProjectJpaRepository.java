package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectSummary;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data access to {@link ProjectEntity}; used only by {@link JpaProjectRepository}. */
interface ProjectJpaRepository extends JpaRepository<ProjectEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ProjectEntity p where p.id = :id")
    Optional<ProjectEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query("select new com.kopruq.bridge.application.ProjectSummary(p.id, p.projectName, p.revision, p.createdUtc, p.updatedUtc) "
            + "from ProjectEntity p")
    List<ProjectSummary> findSummaries();
}
