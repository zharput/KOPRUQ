package com.kopruq.terrain.domain;

import com.kopruq.geometry.model.Point3D;

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
        return parseWithDiagnostics(text).points();
    }

    /**
     * Same tolerant parsing as {@link #parse}, plus the counts of rows that were skipped for
     * non-finite numbers and of rows with more than three numeric columns. A leading UTF-8 byte
     * order mark (common in Windows exports) is removed so it does not turn the first point into
     * a non-numeric "header" row.
     */
    static XyzParseResult parseWithDiagnostics(String text) {
        List<Point3D> points = new ArrayList<>();
        int nonFiniteRows = 0;
        int wideRows = 0;
        if (text.startsWith("\uFEFF")) {
            text = text.substring(1);
        }
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
            if (!Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(z)) {
                nonFiniteRows++;
                continue;
            }
            int numericColumns = 0;
            for (String token : tokens) {
                if (tryParse(token) != null) {
                    numericColumns++;
                }
            }
            if (numericColumns > 3) {
                wideRows++;
            }
            points.add(new Point3D(x, y, z));
        }
        return new XyzParseResult(points, nonFiniteRows, wideRows);
    }

    private static Double tryParse(String token) {
        try {
            return Double.parseDouble(token);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
