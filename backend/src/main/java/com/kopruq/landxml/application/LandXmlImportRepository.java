package com.kopruq.landxml.application;

import java.util.List;
import java.util.Optional;
import com.kopruq.landxml.model.LandXmlImportResult;

/**
 * Storage port for a committed {@link LandXmlImportResult} (the alignment+profile pair, keyed separately from
 * {@code TerrainRepository} since a LandXML import may or may not include an alignment). The production adapter is
 * {@code com.kopruq.landxml.infra.persistence.JpaLandXmlImportRepository}; it stores only a reference to the terrain,
 * which the import use case saves through {@code TerrainRepository} in the same transaction.
 */
public interface LandXmlImportRepository {

    LandXmlImportResult save(LandXmlImportResult result);

    Optional<LandXmlImportResult> findById(String id);

    /** The id of the terrain the import refers to, without loading the terrain; empty when the import is unknown. */
    Optional<String> findTerrainId(String id);

    /** The ids of every import that refers to the given terrain. */
    List<String> findIdsByTerrainId(String terrainId);

    /** Removes an import with its warnings, alignment elements and profile points; no-op when unknown. */
    void deleteById(String id);
}
