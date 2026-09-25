package com.kopruq.terrain;

import com.kopruq.spatialcore.CoordinateSystem;
import com.kopruq.spatialcore.Point3D;

import java.util.List;

/**
 * A triangulated terrain surface (TIN). Solver- and rendering-
 * independent by design (mirrors {@code bridge-core}'s discipline) - no
 * reference to Three.js or any specific GIS provider anywhere in this
 * public API.
 *
 * <p>{@code coordinateSystem} is an honest label only (spec section 22 -
 * never silently assume a CRS/EPSG code); no reprojection happens in
 * this module. {@code localOrigin} (= {@code boundsMin}) exists purely
 * so a mesh consumer (e.g. a 3D viewer) can render small, local
 * coordinates instead of large real-world ones - see
 * {@code TerrainMeshResponse} in the {@code api} module.
 */
public record TerrainModel(
        String id,
        String projectId,
        CoordinateSystem coordinateSystem,
        String sourceType,
        String sourceFileName,
        Point3D boundsMin,
        Point3D boundsMax,
        double minElevationM,
        double maxElevationM,
        List<Point3D> vertices,
        List<TerrainTriangle> triangles,
        Point3D localOrigin,
        int version,
        TerrainStatus status,
        List<TerrainBoundary> boundaries,
        List<TerrainBreakline> breaklines,
        TerrainSource source) {
    public TerrainModel(String id, String projectId, CoordinateSystem coordinateSystem,
            String sourceType, String sourceFileName, Point3D boundsMin, Point3D boundsMax,
            double minElevationM, double maxElevationM, List<Point3D> vertices,
            List<TerrainTriangle> triangles, Point3D localOrigin, int version, TerrainStatus status) {
        this(id, projectId, coordinateSystem, sourceType, sourceFileName, boundsMin, boundsMax,
                minElevationM, maxElevationM, vertices, triangles, localOrigin, version, status,
                List.of(), List.of(), null);
    }
}
