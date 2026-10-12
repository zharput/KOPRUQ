package com.kopruq.api.terrain.application;

import com.kopruq.terrain.InMemoryTerrainRepository;
import com.kopruq.terrain.TerrainImportResult;
import com.kopruq.terrain.TerrainImportService;
import com.kopruq.terrain.TerrainModel;
import com.kopruq.terrain.TerrainQueryService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainServicesTest {

    private static final String XYZ = """
            X Y Z
            0 0 2.0
            10 0 7.0
            10 10 10.0
            0 10 5.0
            5 5 6.5
            """;

    private final InMemoryTerrainRepository repository = new InMemoryTerrainRepository();
    private final TerrainImportUseCase importUseCase = new TerrainImportUseCase(new TerrainImportService(), repository);
    private final TerrainReadService readService = new TerrainReadService(repository, new TerrainQueryService());

    @Test
    void importStoresTheTerrain_andTheReadServiceFindsIt() {
        TerrainImportResult result = importUseCase.importXyz("p1", "t.xyz", "Local", XYZ);

        assertEquals(5, result.terrain().vertices().size());
        assertSame(result.terrain(), repository.findById(result.terrain().id()).orElseThrow());
        assertSame(result.terrain(), readService.findById(result.terrain().id()).orElseThrow());
        assertTrue(readService.findById("unknown").isEmpty());
    }

    @Test
    void elevationAt_answersAtAVertex_andIsEmptyOutsideTheSurface() {
        TerrainModel terrain = importUseCase.importXyz("p1", "t.xyz", "Local", XYZ).terrain();

        assertEquals(6.5, readService.elevationAt(terrain, 5, 5).orElseThrow(), 1e-9);
        assertTrue(readService.elevationAt(terrain, 500, 500).isEmpty());
    }
}
