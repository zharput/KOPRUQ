package com.kopruq.api.terrain;

import com.kopruq.spatialcore.Point3D;
import com.kopruq.terrain.TerrainModel;

import java.util.List;

/**
 * Import confirmation summary - no mesh payload here, see
 * {@link TerrainMeshResponse}. {@code previewPoints} is the first 10 of
 * the backend's own deduplicated vertex list (not a re-parse of the
 * upload) - lets the UI show an honest preview table sourced from what
 * was actually imported, e.g. reflecting duplicate-(x,y) points dropped
 * during triangulation.
 */
public record TerrainImportResponse(
        String id,
        int pointCount,
        int triangleCount,
        double minXM, double maxXM,
        double minYM, double maxYM,
        double minElevationM, double maxElevationM,
        List<Point3D> previewPoints) {

    private static final int PREVIEW_LIMIT = 10;

    public static TerrainImportResponse from(TerrainModel terrain) {
        List<Point3D> vertices = terrain.vertices();
        return new TerrainImportResponse(
                terrain.id(),
                vertices.size(),
                terrain.triangles().size(),
                terrain.boundsMin().x(), terrain.boundsMax().x(),
                terrain.boundsMin().y(), terrain.boundsMax().y(),
                terrain.minElevationM(), terrain.maxElevationM(),
                vertices.subList(0, Math.min(PREVIEW_LIMIT, vertices.size())));
    }
}
