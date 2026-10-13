package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Spring Data access to {@link CrossSectionEntity} (one row per project, keyed by the project id). */
interface CrossSectionJpaRepository extends JpaRepository<CrossSectionEntity, UUID> {
}
