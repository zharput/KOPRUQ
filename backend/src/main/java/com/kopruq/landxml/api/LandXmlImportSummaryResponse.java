package com.kopruq.landxml.api;

import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.model.TerrainSource;

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
        List<String> warnings, String status, com.kopruq.terrain.model.TerrainSource source,
        com.kopruq.geometry.model.Point3D boundsMin, com.kopruq.geometry.model.Point3D boundsMax,
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
                result.terrain().countBoundaries("OUTER"),
                result.terrain().countBoundaries("VOID"),
                result.terrain().breaklines().size());
    }
}
