package com.kopruq.landxml.infra.persistence;

import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.application.TerrainRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * PostgreSQL/JPA adapter of the {@link LandXmlImportRepository} port. It stores the alignment, the vertical profile,
 * the warnings and a reference to the terrain; the terrain itself is stored by the use case through the
 * {@link TerrainRepository} (so {@code save} expects it to be stored already, in the same transaction).
 */
@Repository
@Transactional
public class JpaLandXmlImportRepository implements LandXmlImportRepository {

    private final LandXmlImportJpaRepository jpa;
    private final TerrainRepository terrainRepository;

    public JpaLandXmlImportRepository(LandXmlImportJpaRepository jpa, TerrainRepository terrainRepository) {
        this.jpa = jpa;
        this.terrainRepository = terrainRepository;
    }

    @Override
    public LandXmlImportResult save(LandXmlImportResult result) {
        LandXmlImportEntity entity = jpa.findById(result.id()).orElseGet(() -> new LandXmlImportEntity(result.id()));
        entity.apply(result);
        jpa.saveAndFlush(entity);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LandXmlImportResult> findById(String id) {
        return jpa.findById(id).map(entity -> entity.toDomain(terrainRepository.findById(entity.getTerrainId())
                .orElseThrow(() -> new IllegalStateException("LandXML import " + id + " references terrain "
                        + entity.getTerrainId() + " which is not stored"))));
    }
}
