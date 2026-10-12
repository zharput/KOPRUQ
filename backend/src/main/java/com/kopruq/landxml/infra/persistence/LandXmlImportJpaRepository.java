package com.kopruq.landxml.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data access to {@link LandXmlImportEntity}; used only by {@link JpaLandXmlImportRepository}. */
interface LandXmlImportJpaRepository extends JpaRepository<LandXmlImportEntity, String> {
}
