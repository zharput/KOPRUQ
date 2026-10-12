package com.kopruq.landxml.application;

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
}
