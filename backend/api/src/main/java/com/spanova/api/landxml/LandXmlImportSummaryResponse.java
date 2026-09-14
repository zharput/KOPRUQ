package com.spanova.api.landxml;

import com.spanova.landxml.LandXmlImportResult;

import java.util.List;

/** {@code terrainId} is exactly {@code TerrainModel.id()} - the existing {@code /api/terrain/{id}/mesh|elevation} endpoints work unchanged against it. */
public record LandXmlImportSummaryResponse(
        String id,
        String terrainId,
        int pointCount,
        int triangleCount,
        boolean hasAlignment,
        double alignmentLengthM,
        boolean hasProfile,
        List<String> warnings, String status, com.spanova.terrain.TerrainSource source,
        com.spanova.spatialcore.Point3D boundsMin, com.spanova.spatialcore.Point3D boundsMax,
        long outerBoundaries, long voidBoundaries, int breaklines) {

    public static LandXmlImportSummaryResponse from(LandXmlImportResult result) {
        return new LandXmlImportSummaryResponse(
                result.id(),
                result.terrain().id(),
                result.terrain().vertices().size(),
                result.terrain().triangles().size(),
                result.alignment() != null,
                result.alignment() != null ? result.alignment().totalLengthM() : 0,
                result.profile() != null,
                result.warnings(), result.terrain().status().name(), result.terrain().source(),
                result.terrain().boundsMin(), result.terrain().boundsMax(),
                result.terrain().boundaries().stream().filter(b -> "OUTER".equals(b.type())).count(),
                result.terrain().boundaries().stream().filter(b -> "VOID".equals(b.type())).count(),
                result.terrain().breaklines().size());
    }
}
