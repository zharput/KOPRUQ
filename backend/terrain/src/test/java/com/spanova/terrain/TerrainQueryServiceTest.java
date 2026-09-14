package com.spanova.terrain;

import com.spanova.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainQueryServiceTest {

    private final TerrainQueryService queryService = new TerrainQueryService();

    /**
     * A planar surface z = 2 + 0.5x + 0.3y over a 10x10 square, split
     * into 2 triangles. Barycentric interpolation of a planar function
     * is exact everywhere inside the surface, regardless of which
     * triangle a query point falls in - this is what makes it a solid,
     * engineer-independent correctness check (pure geometry, not an
     * invented engineering assumption): "compare selected terrain
     * elevations against source DTM values."
     */
    private static TerrainModel planarTerrain() {
        List<Point3D> vertices = List.of(
                new Point3D(0, 0, 2.0),
                new Point3D(10, 0, 7.0),
                new Point3D(10, 10, 10.0),
                new Point3D(0, 10, 5.0));
        List<TerrainTriangle> triangles = List.of(
                new TerrainTriangle(0, 1, 2),
                new TerrainTriangle(0, 2, 3));
        Point3D boundsMin = new Point3D(0, 0, 2.0);
        Point3D boundsMax = new Point3D(10, 10, 10.0);
        return new TerrainModel(
                "t1", "p1", null, "test", "test.xyz",
                boundsMin, boundsMax, 2.0, 10.0,
                vertices, triangles, boundsMin, 1, TerrainStatus.IMPORTED);
    }

    private static double expectedPlaneZ(double x, double y) {
        return 2 + 0.5 * x + 0.3 * y;
    }

    @Test
    void elevationAtVertexMatchesExactly() {
        TerrainModel terrain = planarTerrain();

        Optional<Double> elevation = queryService.getElevation(terrain, 10, 10);

        assertTrue(elevation.isPresent());
        assertEquals(10.0, elevation.get(), 1e-9);
    }

    @Test
    void elevationInsideTriangleIsBarycentricallyInterpolated() {
        TerrainModel terrain = planarTerrain();
        double[][] samples = {{5, 5}, {3, 7}, {8, 2}, {1, 9}};

        for (double[] sample : samples) {
            double x = sample[0], y = sample[1];
            Optional<Double> elevation = queryService.getElevation(terrain, x, y);
            assertTrue(elevation.isPresent(), "expected an elevation at (" + x + "," + y + ")");
            assertEquals(expectedPlaneZ(x, y), elevation.get(), 1e-9);
        }
    }

    @Test
    void elevationOutsideTerrainIsEmpty() {
        TerrainModel terrain = planarTerrain();

        assertTrue(queryService.getElevation(terrain, -5, -5).isEmpty());
    }
}
