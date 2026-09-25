package com.kopruq.terrain;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemoryTerrainRepository implements TerrainRepository {

    private final Map<String, TerrainModel> byId = new ConcurrentHashMap<>();

    @Override
    public TerrainModel save(TerrainModel terrain) {
        byId.put(terrain.id(), terrain);
        return terrain;
    }

    @Override
    public Optional<TerrainModel> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
}
