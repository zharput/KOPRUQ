package com.kopruq.terrain.application;

import com.kopruq.terrain.domain.TerrainQueryService;
import com.kopruq.terrain.model.TerrainModel;

import java.util.Optional;

/** Read side of the stored terrains: lookup by id and elevation-at-(x, y) queries. */
public class TerrainReadService {

    private final TerrainRepository repository;
    private final TerrainQueryService queryService;

    public TerrainReadService(TerrainRepository repository, TerrainQueryService queryService) {
        this.repository = repository;
        this.queryService = queryService;
    }

    public Optional<TerrainModel> findById(String id) {
        return repository.findById(id);
    }

    /** Elevation in metres at plan position (x, y) in the terrain own coordinates, or empty outside the surface. */
    public Optional<Double> elevationAt(TerrainModel terrain, double x, double y) {
        return queryService.getElevation(terrain, x, y);
    }
}
