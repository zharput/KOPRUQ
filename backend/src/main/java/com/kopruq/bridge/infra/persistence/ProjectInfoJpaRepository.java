package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Spring Data access to {@link ProjectInfoEntity}; used only by {@link JpaProjectContentRepository}. */
interface ProjectInfoJpaRepository extends JpaRepository<ProjectInfoEntity, UUID> {
}
