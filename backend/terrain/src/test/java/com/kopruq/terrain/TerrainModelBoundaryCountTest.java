package com.kopruq.terrain;

import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TerrainModelBoundaryCountTest {

    @Test
    void countsBoundariesByType() {
        Point3D p = new Point3D(0, 0, 0);
        List<TerrainBoundary> boundaries = List.of(
                new TerrainBoundary("o1", "OUTER", false, List.of()),
                new TerrainBoundary("v1", "VOID", false, List.of()),
                new TerrainBoundary("v2", "VOID", true, List.of()));
        TerrainModel terrain = new TerrainModel("t", "p", null, "test", "t.xyz", p, p, 0, 0, List.of(), List.of(), p, 1,
                TerrainStatus.IMPORTED, boundaries, List.of(), null);
        assertEquals(1, terrain.countBoundaries("OUTER"));
        assertEquals(2, terrain.countBoundaries("VOID"));
        assertEquals(0, terrain.countBoundaries("OTHER"));
    }
}
