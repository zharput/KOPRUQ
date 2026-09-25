package com.kopruq.landxml;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.VerticalProfile;
import com.kopruq.terrain.TerrainModel;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * Orchestrates the two-step LandXML import flow (LANDXML-P01,
 * docs/roadmap.md sections 24-26 - never auto-import everything when a
 * file has multiple surfaces/alignments): {@link #inspect} parses only,
 * for the import-preview screen; {@link #commit} parses again and maps
 * the engineer's selected surface/alignment into KOPRUQ domain
 * objects. Re-parsing rather than caching the inspected document across
 * the HTTP request boundary matches this app's existing discipline - no
 * server-side session state exists anywhere else in the codebase either.
 */
public final class LandXmlImportService {

    private final LandXmlParser parser = new LandXmlParser();
    private final LandXmlTerrainMapper terrainMapper = new LandXmlTerrainMapper();
    private final LandXmlAlignmentMapper alignmentMapper = new LandXmlAlignmentMapper();
    private final LandXmlProfileMapper profileMapper = new LandXmlProfileMapper();

    public LandXmlDocument inspect(InputStream input) {
        return parser.parse(input);
    }

    public LandXmlImportResult commit(InputStream input, String projectId, String sourceFileName,
            String coordinateSystemLabel, String surfaceName, String alignmentName) {
        return commit(input, projectId, sourceFileName, coordinateSystemLabel, surfaceName, alignmentName,
                CoordinateOrder.FIRST_Y_SECOND_X);
    }

    public LandXmlImportResult commit(InputStream input, String projectId, String sourceFileName,
            String coordinateSystemLabel, String surfaceName, String alignmentName, CoordinateOrder coordinateOrder) {
        if (coordinateOrder == null) throw new IllegalArgumentException("Coordinate order must be confirmed");
        if (alignmentName != null && coordinateOrder != CoordinateOrder.FIRST_Y_SECOND_X) {
            throw new IllegalArgumentException("Alignment import currently requires coordinate1=Y, coordinate2=X; choose terrain only for X/Y order");
        }
        LandXmlDocument document = parser.parse(input, surfaceName);
        if (!"meter".equalsIgnoreCase(document.units().linearUnit())) {
            throw new IllegalArgumentException("UNSUPPORTED_UNITS: expected meter, got " + document.units().linearUnit());
        }
        List<String> warnings = new ArrayList<>(document.warnings());

        LandXmlSurface surface = findByName(document.surfaces(), LandXmlSurface::name, surfaceName, "surface");
        TerrainModel terrain = terrainMapper.toTerrainModel(surface, projectId, sourceFileName, coordinateSystemLabel, warnings, coordinateOrder, document.application(), document.formatVersion(), document.units().linearUnit());

        Alignment alignment = null;
        VerticalProfile profile = null;
        if (alignmentName != null) {
            LandXmlAlignment landXmlAlignment = findByName(document.alignments(), LandXmlAlignment::name, alignmentName, "alignment");
            alignment = alignmentMapper.toAlignment(landXmlAlignment);

            LandXmlProfile landXmlProfile = document.profiles().stream()
                    .filter(p -> alignmentName.equals(p.alignmentName()))
                    .findFirst()
                    .orElse(null);
            if (landXmlProfile != null) {
                profile = profileMapper.toVerticalProfile(landXmlProfile);
            } else {
                warnings.add("Alignment \"" + alignmentName + "\" has no vertical profile - ground elevation only will be available.");
            }
        }

        return new LandXmlImportResult(UUID.randomUUID().toString(), terrain, alignment, profile, warnings);
    }

    private static <T> T findByName(List<T> items, Function<T, String> nameFn, String name, String kind) {
        return items.stream()
                .filter(item -> name.equals(nameFn.apply(item)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No " + kind + " named \"" + name + "\" found in this file"));
    }
}
