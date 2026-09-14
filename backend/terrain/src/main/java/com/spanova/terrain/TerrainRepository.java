package com.spanova.terrain;

import java.util.Optional;

/**
 * Storage port for {@link TerrainModel}s. TERRAIN-P01 ships only
 * {@link InMemoryTerrainRepository} - no persistence layer exists
 * anywhere else in this app yet either (BridgeLayoutEngine/
 * GenerateWorkflow results aren't persisted server-side today), so an
 * in-memory store matches the rest of the codebase rather than
 * introducing a database decision nobody has asked for.
 */
public interface TerrainRepository {

    TerrainModel save(TerrainModel terrain);

    Optional<TerrainModel> findById(String id);
}
