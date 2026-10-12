package com.kopruq.terrain;

import com.kopruq.spatialcore.Point3D;

import java.util.List;

/**
 * The local-origin transform of a terrain mesh: real-world coordinates are translated by a local origin
 * ({@link TerrainModel#localOrigin()}) so a consumer (e.g. a 3D viewer) works with small numbers. Pure
 * subtraction in metres, no reprojection.
 */
public final class LocalCoordinates {

    private LocalCoordinates() {
    }

    /**
     * @param points the points, in the terrain's own (real-world) coordinates, metres
     * @param origin the local origin, same coordinates, metres
     * @return a flat {@code [x0,y0,z0,x1,y1,z1,...]} array of {@code point - origin}, metres
     */
    public static double[] relativePositions(List<Point3D> points, Point3D origin) {
        double[] positions = new double[points.size() * 3];
        for (int i = 0; i < points.size(); i++) {
            Point3D p = points.get(i);
            positions[i * 3] = p.x() - origin.x();
            positions[i * 3 + 1] = p.y() - origin.y();
            positions[i * 3 + 2] = p.z() - origin.z();
        }
        return positions;
    }
}
