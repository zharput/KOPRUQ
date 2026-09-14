package com.spanova.landxml;

import com.spanova.spatialcore.CoordinateSystem;
import com.spanova.spatialcore.Point3D;
import com.spanova.terrain.*;
import java.util.*;

/** Converts only source Definition/Pnts + Faces; never triangulates or clips. */
public final class LandXmlTerrainMapper {
    public TerrainModel toTerrainModel(LandXmlSurface surface, String projectId, String fileName,
            String crs, List<String> warnings) {
        return toTerrainModel(surface, projectId, fileName, crs, warnings,
                CoordinateOrder.FIRST_Y_SECOND_X, null, null, "meter");
    }

    public TerrainModel toTerrainModel(LandXmlSurface surface, String projectId, String fileName,
            String crs, List<String> warnings, CoordinateOrder order, String application, String version, String units) {
        if (surface.points().isEmpty()) throw new IllegalArgumentException("TIN_POINTS_MISSING: no valid Definition/Pnts");
        if (surface.faces().isEmpty()) throw new IllegalArgumentException(
                "TIN_TOPOLOGY_MISSING: no valid Definition/Faces; malformed faces=" + surface.invalidFaces());
        Map<String, Integer> indexById = new HashMap<>();
        Set<String> ambiguous = new HashSet<>();
        List<Point3D> vertices = new ArrayList<>(surface.points().size());
        int duplicates = 0;
        for (LandXmlPoint point : surface.points()) {
            if (indexById.putIfAbsent(point.id(), vertices.size()) != null) {
                ambiguous.add(point.id()); duplicates++;
            }
            vertices.add(order.map(point));
        }
        int invalid = surface.invalidFaces(), missing = 0, degenerate = 0;
        List<TerrainTriangle> triangles = new ArrayList<>(surface.faces().size());
        for (LandXmlFace face : surface.faces()) {
            Integer ai = indexById.get(face.p1()), bi = indexById.get(face.p2()), ci = indexById.get(face.p3());
            if (ai == null || bi == null || ci == null) {
                missing += (ai == null ? 1 : 0) + (bi == null ? 1 : 0) + (ci == null ? 1 : 0);
                invalid++; continue;
            }
            if (ambiguous.contains(face.p1()) || ambiguous.contains(face.p2()) || ambiguous.contains(face.p3())) {
                invalid++; continue;
            }
            Point3D p = vertices.get(ai), q = vertices.get(bi), v = vertices.get(ci);
            double area2 = (q.x()-p.x())*(v.y()-p.y()) - (q.y()-p.y())*(v.x()-p.x());
            // Retain degenerate source faces for topology fidelity, flag them; elevation queries ignore them.
            if (area2 == 0) degenerate++;
            triangles.add(new TerrainTriangle(ai, bi, ci));
        }
        if (triangles.isEmpty()) throw new IllegalArgumentException("TIN_TOPOLOGY_INVALID: no resolvable faces; invalid="
                + invalid + ", missing references=" + missing + ", duplicate point IDs=" + duplicates);
        double minX=Double.POSITIVE_INFINITY,minY=minX,minZ=minX;
        double maxX=Double.NEGATIVE_INFINITY,maxY=maxX,maxZ=maxX;
        for (Point3D p : vertices) {
            minX=Math.min(minX,p.x());minY=Math.min(minY,p.y());minZ=Math.min(minZ,p.z());
            maxX=Math.max(maxX,p.x());maxY=Math.max(maxY,p.y());maxZ=Math.max(maxZ,p.z());
        }
        var min = new Point3D(minX,minY,minZ); var max = new Point3D(maxX,maxY,maxZ);
        if (invalid > 0 || duplicates > 0 || degenerate > 0 || surface.invalidPoints() > 0) {
            warnings.add("TIN diagnostics: invalid points=" + surface.invalidPoints() + ", duplicate IDs=" + duplicates
                    + ", invalid faces=" + invalid + ", missing references=" + missing + ", degenerate faces=" + degenerate);
        }
        boolean unknownCrs = crs == null || crs.isBlank() || crs.toLowerCase(Locale.ROOT).contains("unknown");
        if (unknownCrs) warnings.add("CRS unconfirmed: coordinates retained without reprojection.");
        var source = new TerrainSource(application, version, units, surface.name(), order.name(),
                surface.points().size()+surface.invalidPoints(), surface.faces().size()+surface.invalidFaces(),
                surface.invalidPoints(), duplicates, invalid, missing, degenerate);
        return new TerrainModel(UUID.randomUUID().toString(), projectId, new CoordinateSystem(null, crs),
                "landxml", fileName, min, max, minZ, maxZ, vertices, triangles, min, 1,
                warnings.isEmpty() ? TerrainStatus.VALID : TerrainStatus.REVIEW_REQUIRED,
                surface.boundaries().stream().map(b -> new TerrainBoundary(b.name(), b.type(), b.edgeTrim(),
                        b.points().stream().map(order::map).toList())).toList(),
                surface.breaklines().stream().map(b -> new TerrainBreakline(b.name(),
                        b.points().stream().map(order::map).toList())).toList(), source);
    }
}
