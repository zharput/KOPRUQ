package com.kopruq.bridge.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Spring Data access to {@link GirderLibraryEntity} (one row per project, keyed by the project id). */
interface GirderLibraryJpaRepository extends JpaRepository<GirderLibraryEntity, UUID> {
}
