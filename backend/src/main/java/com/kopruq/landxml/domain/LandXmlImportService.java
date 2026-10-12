package com.kopruq.landxml.domain;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.VerticalProfile;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlAlignment;
import com.kopruq.landxml.model.LandXmlDocument;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.landxml.model.LandXmlProfile;
import com.kopruq.landxml.model.LandXmlSurface;
import com.kopruq.terrain.model.TerrainModel;

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
            requireNoInteriorGap(landXmlAlignment);
            alignment = alignmentMapper.toAlignment(landXmlAlignment);

            List<LandXmlProfile> alignmentProfiles = document.profiles().stream()
                    .filter(p -> alignmentName.equals(p.alignmentName()))
                    .toList();
            if (alignmentProfiles.isEmpty()) {
                warnings.add("Alignment \"" + alignmentName + "\" has no vertical profile - ground elevation only will be available.");
            } else {
                profile = selectProfile(alignmentName, landXmlAlignment, alignmentProfiles, warnings);
            }
        }

        return new LandXmlImportResult(UUID.randomUUID().toString(), terrain, alignment, profile, warnings);
    }

    /**
     * Fail-closed profile selection: a design profile is attached ONLY if it is unambiguous and fully understood.
     * Otherwise no profile is imported ({@code hasProfile=false}) and each reason is reported as a warning - the
     * ground elevation stays available, but no possibly-wrong design elevation is shown.
     */
    private VerticalProfile selectProfile(String alignmentName, LandXmlAlignment landXmlAlignment,
            List<LandXmlProfile> candidates, List<String> warnings) {
        String prefix = "Alignment \"" + alignmentName + "\": vertical profile not imported - ";
        List<String> problems = new ArrayList<>();
        if (candidates.size() > 1) {
            problems.add("MULTIPLE_PROFILES: the file defines " + candidates.size()
                    + " vertical profiles for this alignment; choosing between them is not supported.");
        }
        LandXmlProfile only = candidates.get(0);
        if (candidates.size() == 1 && only.hasUnsupportedCurves()) {
            problems.add("VERTICAL_CURVE_UNSUPPORTED: profile \"" + only.name() + "\" contains vertical-curve content that is not "
                    + "interpreted (" + String.join("; ", only.unsupportedReasons()) + "); the curve type needs the engineer's decision.");
        }
        if (landXmlAlignment.hasUnconfirmedStationOffset()) {
            problems.add("STATION_OFFSET_UNCONFIRMED: the alignment declares staStart=" + landXmlAlignment.staStart()
                    + " (not 0); how profile chainages relate to it is not confirmed.");
        }
        VerticalProfile mapped = null;
        if (candidates.size() == 1 && problems.isEmpty()) {
            try {
                mapped = profileMapper.toVerticalProfile(only);
            } catch (IllegalArgumentException e) {
                problems.add("VERTICAL_PROFILE_INVALID: " + e.getMessage());
            }
        }
        if (!problems.isEmpty()) {
            for (String problem : problems) {
                warnings.add(prefix + problem);
            }
            return null;
        }
        return mapped;
    }

    /**
     * A skipped element (unsupported Spiral, or a Line/Curve with missing data) followed by more geometry would make
     * the importer silently join two pieces that are not adjacent, producing a wrong alignment geometry. That is
     * refused. A skipped element at the very END of the alignment (e.g. a trailing Spiral) only shortens it and
     * stays an accepted case, reported by the existing warning.
     */
    private static void requireNoInteriorGap(LandXmlAlignment alignment) {
        var gaps = alignment.interiorGaps();
        if (!gaps.isEmpty()) {
            var first = gaps.get(0);
            throw new IllegalArgumentException("ALIGNMENT_INCOMPLETE: alignment \"" + alignment.name() + "\" has a skipped <"
                    + first.kind() + "> at geometry position " + first.position() + " that is followed by further geometry; "
                    + "importing it would silently join two non-adjacent parts. Import the alignment without it, or fix the source file.");
        }
    }

    private static <T> T findByName(List<T> items, Function<T, String> nameFn, String name, String kind) {
        return items.stream()
                .filter(item -> name.equals(nameFn.apply(item)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No " + kind + " named \"" + name + "\" found in this file"));
    }
}
