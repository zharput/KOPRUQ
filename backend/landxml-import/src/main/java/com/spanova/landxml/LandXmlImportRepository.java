package com.spanova.landxml;

import java.util.Optional;

/**
 * Storage port for a committed {@link LandXmlImportResult} (the
 * alignment+profile pair, keyed separately from {@code TerrainRepository}
 * since a LandXML import may or may not include an alignment). Same
 * in-memory-only discipline as {@code TerrainRepository} - no
 * persistence layer exists anywhere in this app yet.
 */
public interface LandXmlImportRepository {

    LandXmlImportResult save(LandXmlImportResult result);

    Optional<LandXmlImportResult> findById(String id);
}
