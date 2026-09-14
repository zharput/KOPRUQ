package com.spanova.api.terrain;

import com.spanova.spatialcore.Point3D;
import com.spanova.terrain.TerrainModel;
import com.spanova.terrain.TerrainTriangle;

import java.util.List;

/**
 * Flat, indexed-buffer-friendly mesh payload for the React Three Fiber
 * viewer - "do not send one object per triangle" (docs/roadmap.md
 * TERRAIN-P01). {@code positions} is a flat [x0,y0,z0,x1,y1,z1,...]
 * array already translated by {@code localOrigin} - real-world
 * coordinates never reach the frontend directly, this is the one
 * centralized coordinate-transform point (see docs/architecture.md's
 * coordinate-architecture note). {@code indices} is a flat
 * [a0,b0,c0,a1,b1,c1,...] triangle index list.
 *
 * <p>Vertex normals are NOT computed here - the frontend calls
 * Three.js's own {@code BufferGeometry.computeVertexNormals()}, a
 * standard, well-known utility, rather than duplicating that
 * computation server-side.
 */
public record TerrainMeshResponse(
        String id,
        double[] positions,
        int[] indices,
        Point3D localOrigin) {

    public static TerrainMeshResponse from(TerrainModel terrain) {
        List<Point3D> vertices = terrain.vertices();
        Point3D origin = terrain.localOrigin();
        double[] positions = new double[vertices.size() * 3];
        for (int i = 0; i < vertices.size(); i++) {
            Point3D v = vertices.get(i);
            positions[i * 3] = v.x() - origin.x();
            positions[i * 3 + 1] = v.y() - origin.y();
            positions[i * 3 + 2] = v.z() - origin.z();
        }

        List<TerrainTriangle> triangles = terrain.triangles();
        int[] indices = new int[triangles.size() * 3];
        for (int i = 0; i < triangles.size(); i++) {
            TerrainTriangle t = triangles.get(i);
            indices[i * 3] = t.a();
            indices[i * 3 + 1] = t.b();
            indices[i * 3 + 2] = t.c();
        }

        return new TerrainMeshResponse(terrain.id(), positions, indices, origin);
    }
}
