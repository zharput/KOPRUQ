package com.kopruq.landxml.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Spring Data access to {@link LandXmlImportEntity}; used only by {@link JpaLandXmlImportRepository}. */
interface LandXmlImportJpaRepository extends JpaRepository<LandXmlImportEntity, String> {

    List<LandXmlImportEntity> findByTerrainId(String terrainId);
}
