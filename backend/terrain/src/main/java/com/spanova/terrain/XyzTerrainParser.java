package com.spanova.terrain;

import com.spanova.spatialcore.Point3D;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses a plain-text X/Y/Z point file (the {@code .xyz}/{@code .csv}/
 * {@code .txt} DTM export shape - comma- or whitespace-separated, one
 * point per line). Mirrors the tolerant parsing already prototyped
 * client-side in {@code frontend/src/features/terrain-dtm/components/
 * TerrainDtmPanel.tsx} (2026-09-14) - a non-numeric line (e.g. a header
 * row "X Y Z") is silently skipped, not an error, matching that
 * prototype's behavior exactly.
 */
final class XyzTerrainParser {

    private XyzTerrainParser() {
    }

    static List<Point3D> parse(String text) {
        List<Point3D> points = new ArrayList<>();
        for (String rawLine : text.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }
            String[] tokens = line.split("[,\\s]+");
            if (tokens.length < 3) {
                continue;
            }
            Double x = tryParse(tokens[0]);
            Double y = tryParse(tokens[1]);
            Double z = tryParse(tokens[2]);
            if (x == null || y == null || z == null) {
                continue;
            }
            points.add(new Point3D(x, y, z));
        }
        return points;
    }

    private static Double tryParse(String token) {
        try {
            return Double.parseDouble(token);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
