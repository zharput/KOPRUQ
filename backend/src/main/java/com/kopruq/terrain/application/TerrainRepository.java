package com.kopruq.terrain.application;

import java.util.Optional;
import com.kopruq.terrain.model.TerrainModel;

/**
 * Storage port for {@link TerrainModel}s. The production adapter is
 * {@code com.kopruq.terrain.infra.persistence.JpaTerrainRepository} (PostgreSQL via JPA/Flyway); an in-memory
 * implementation exists only in the test sources.
 */
public interface TerrainRepository {

    TerrainModel save(TerrainModel terrain);

    Optional<TerrainModel> findById(String id);

    /** Removes a terrain; used internally to undo a partially completed import (no endpoint exposes it). */
    void deleteById(String id);
}
