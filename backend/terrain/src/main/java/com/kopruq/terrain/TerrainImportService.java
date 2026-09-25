package com.kopruq.terrain;

import com.kopruq.spatialcore.CoordinateSystem;
import com.kopruq.spatialcore.Point3D;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.triangulate.DelaunayTriangulationBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Imports a raw XYZ point file into a triangulated {@link TerrainModel}
 * (TERRAIN-P01, reactivating docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md's
 * "simple TIN" first implementation, deferred by addendum Q until real
 * DTM data existed).
 *
 * <p>Triangulation: JTS's {@link DelaunayTriangulationBuilder} (2D
 * Delaunay over x,y - JTS has no z-aware triangulation; z is reattached
 * afterwards from the original point per (x,y) site, the standard
 * "2.5D" TIN approach). Points sharing the same (x,y) are deduplicated,
 * keeping the first occurrence - a TIN is a single-valued surface, so
 * an ambiguous second z at the same (x,y) cannot be represented; this
 * is a data-quality tradeoff, not a silent one (the caller can inspect
 * {@code vertices().size()} against the input point count to notice
 * duplicates were dropped).
 */
public final class TerrainImportService {

    public TerrainModel importXyz(String projectId, String sourceFileName, String coordinateSystemLabel, String xyzText) {
        List<Point3D> rawPoints = XyzTerrainParser.parse(xyzText);
        if (rawPoints.isEmpty()) {
            throw new IllegalArgumentException("No valid X Y Z points found in " + sourceFileName);
        }

        Map<Coordinate, Point3D> byLocation = new LinkedHashMap<>();
        for (Point3D p : rawPoints) {
            byLocation.putIfAbsent(new Coordinate(p.x(), p.y()), p);
        }

        List<Point3D> vertices = new ArrayList<>(byLocation.values());
        Map<Coordinate, Integer> indexByLocation = new LinkedHashMap<>();
        List<Coordinate> siteCoordinates = new ArrayList<>(vertices.size());
        for (int i = 0; i < vertices.size(); i++) {
            Coordinate c = new Coordinate(vertices.get(i).x(), vertices.get(i).y());
            indexByLocation.put(c, i);
            siteCoordinates.add(c);
        }

        List<TerrainTriangle> triangles = triangulate(siteCoordinates, indexByLocation);

        double minX = Double.POSITIVE_INFINITY, minY = Double.POSITIVE_INFINITY, minZ = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY, maxY = Double.NEGATIVE_INFINITY, maxZ = Double.NEGATIVE_INFINITY;
        for (Point3D v : vertices) {
            minX = Math.min(minX, v.x());
            minY = Math.min(minY, v.y());
            minZ = Math.min(minZ, v.z());
            maxX = Math.max(maxX, v.x());
            maxY = Math.max(maxY, v.y());
            maxZ = Math.max(maxZ, v.z());
        }
        Point3D boundsMin = new Point3D(minX, minY, minZ);
        Point3D boundsMax = new Point3D(maxX, maxY, maxZ);

        return new TerrainModel(
                UUID.randomUUID().toString(),
                projectId,
                new CoordinateSystem(null, coordinateSystemLabel),
                "xyz",
                sourceFileName,
                boundsMin,
                boundsMax,
                minZ,
                maxZ,
                vertices,
                triangles,
                boundsMin,
                1,
                TerrainStatus.IMPORTED);
    }

    private List<TerrainTriangle> triangulate(List<Coordinate> siteCoordinates, Map<Coordinate, Integer> indexByLocation) {
        List<TerrainTriangle> triangles = new ArrayList<>();
        if (siteCoordinates.size() < 3) {
            return triangles; // not enough points for a surface - caller gets an empty mesh, not a crash
        }

        DelaunayTriangulationBuilder builder = new DelaunayTriangulationBuilder();
        builder.setSites(siteCoordinates);
        Geometry triangleCollection = builder.getTriangles(new GeometryFactory());

        for (int i = 0; i < triangleCollection.getNumGeometries(); i++) {
            Polygon triangle = (Polygon) triangleCollection.getGeometryN(i);
            Coordinate[] corners = triangle.getExteriorRing().getCoordinates(); // 4 coords, closed ring
            Integer a = indexByLocation.get(corners[0]);
            Integer b = indexByLocation.get(corners[1]);
            Integer c = indexByLocation.get(corners[2]);
            if (a == null || b == null || c == null) {
                continue; // defensive: skip a triangle whose corner isn't one of our known sites
            }
            triangles.add(new TerrainTriangle(a, b, c));
        }
        return triangles;
    }
}
