package com.kopruq.terrain.application;

import com.kopruq.terrain.domain.TerrainImportService;
import com.kopruq.terrain.model.TerrainImportResult;

/** Imports an XYZ point file and stores the resulting terrain in the shared {@link TerrainRepository}. */
public class TerrainImportUseCase {

    private final TerrainImportService importService;
    private final TerrainRepository repository;

    public TerrainImportUseCase(TerrainImportService importService, TerrainRepository repository) {
        this.importService = importService;
        this.repository = repository;
    }

    public TerrainImportResult importXyz(String projectId, String sourceFileName, String coordinateSystemLabel,
            String content) {
        TerrainImportResult result = importService.importXyzWithDiagnostics(projectId, sourceFileName, coordinateSystemLabel, content);
        repository.save(result.terrain());
        return result;
    }
}
