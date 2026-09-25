package com.kopruq.terrain;

import com.kopruq.spatialcore.Point3D;

import java.util.List;
import java.util.Optional;

/**
 * Queries a {@link TerrainModel} for the surface elevation at a given
 * (x,y) - "terrain elevation at X,Y", the one query every future
 * engineering consumer (abutment/pier placement, alignment draping,
 * profile charts) ultimately needs. TERRAIN-P01 scope: a plain linear
 * scan over the model's triangles is fast enough at single-bridge-site
 * scale (thousands, not millions, of triangles); a spatial index (JTS
 * STRtree) is deferred to the corridor-scale/tiling milestone
 * (docs/roadmap.md TERRAIN-P04) where it would actually matter.
 */
public final class TerrainQueryService {

    public Optional<Double> getElevation(TerrainModel terrain, double x, double y) {
        List<Point3D> vertices = terrain.vertices();
        for (TerrainTriangle triangle : terrain.triangles()) {
            Point3D a = vertices.get(triangle.a());
            Point3D b = vertices.get(triangle.b());
            Point3D c = vertices.get(triangle.c());
            double[] barycentric = barycentricWeights(x, y, a, b, c);
            if (barycentric == null) {
                continue;
            }
            double elevation = barycentric[0] * a.z() + barycentric[1] * b.z() + barycentric[2] * c.z();
            return Optional.of(elevation);
        }
        return Optional.empty();
    }

    /** Returns {u, v, w} barycentric weights if (x,y) is inside triangle abc (a small tolerance for edges), else null. */
    private static double[] barycentricWeights(double x, double y, Point3D a, Point3D b, Point3D c) {
        double denom = (b.y() - c.y()) * (a.x() - c.x()) + (c.x() - b.x()) * (a.y() - c.y());
        if (denom == 0) {
            return null; // degenerate (zero-area) triangle
        }
        double u = ((b.y() - c.y()) * (x - c.x()) + (c.x() - b.x()) * (y - c.y())) / denom;
        double v = ((c.y() - a.y()) * (x - c.x()) + (a.x() - c.x()) * (y - c.y())) / denom;
        double w = 1 - u - v;
        double tolerance = -1e-9;
        if (u < tolerance || v < tolerance || w < tolerance) {
            return null;
        }
        return new double[] {u, v, w};
    }
}
