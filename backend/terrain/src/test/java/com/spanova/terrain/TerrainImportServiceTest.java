package com.spanova.terrain;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainImportServiceTest {

    private final TerrainImportService importService = new TerrainImportService();
    private final TerrainQueryService queryService = new TerrainQueryService();

    @Test
    void importsAPlanarGridSkippingTheHeaderRow() {
        String xyz = """
                X Y Z
                0 0 2.0
                10 0 7.0
                10 10 10.0
                0 10 5.0
                5 5 6.5
                """;

        TerrainModel terrain = importService.importXyz("proj-1", "test.xyz", "Local/Unknown", xyz);

        assertEquals(5, terrain.vertices().size(), "the header row must be skipped, not counted as a point");
        assertTrue(terrain.triangles().size() >= 3, "5 points should triangulate into at least 3 triangles");
        assertEquals(2.0, terrain.minElevationM(), 1e-9);
        assertEquals(10.0, terrain.maxElevationM(), 1e-9);

        Optional<Double> elevationAtKnownVertex = queryService.getElevation(terrain, 5, 5);
        assertTrue(elevationAtKnownVertex.isPresent());
        assertEquals(6.5, elevationAtKnownVertex.get(), 1e-9);
    }

    @Test
    void rejectsAFileWithNoParseablePoints() {
        assertThrows(IllegalArgumentException.class,
                () -> importService.importXyz("proj-1", "empty.txt", "Local/Unknown", "not,a,point\nalso not one"));
    }
}
