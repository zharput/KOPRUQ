package com.kopruq.terrain.model;

import java.util.List;

/**
 * A freshly imported terrain together with the import diagnostics. {@code warnings}
 * is empty for a clean import; whenever it explains a data problem that needs a
 * human look, the terrain's status is {@link TerrainStatus#REVIEW_REQUIRED}.
 */
public record TerrainImportResult(TerrainModel terrain, List<String> warnings) {
}
