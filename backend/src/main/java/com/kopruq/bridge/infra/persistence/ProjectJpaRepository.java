package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Spring Data access to {@link ProjectEntity}; used only by {@link JpaProjectRepository}. */
interface ProjectJpaRepository extends JpaRepository<ProjectEntity, UUID> {
}
