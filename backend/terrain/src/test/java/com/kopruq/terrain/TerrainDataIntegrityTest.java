package com.kopruq.terrain;

import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 7c: XYZ parsing diagnostics, import review status and non-finite queries. */
class TerrainDataIntegrityTest {

    private final TerrainImportService service = new TerrainImportService();
    private final TerrainQueryService query = new TerrainQueryService();

    private static final String SQUARE = "0 0 1\n10 0 2\n0 10 3\n10 10 4\n";

    @Test
    void parser_removesBom_countsNonFiniteAndWideRows() {
        XyzParseResult r = XyzTerrainParser.parseWithDiagnostics("﻿1 2 3\nNaN 1 1\n1 Infinity 1\n4,5,6,7\n7 8 9 label\n");
        assertEquals(3, r.points().size());
        assertEquals(new Point3D(1, 2, 3), r.points().get(0));
        assertEquals(2, r.nonFiniteRows());
        assertEquals(1, r.wideRows(), "4 numeric columns counts; 3 numbers + a text label does not");
    }

    @Test
    void parser_originalParseMethod_keepsItsBehaviour() {
        assertEquals(2, XyzTerrainParser.parse("X Y Z\n0 0 1\n1,2,3\n").size());
        assertTrue(XyzTerrainParser.parse("NaN NaN NaN\n").isEmpty(), "a NaN point is no longer returned");
    }

    @Test
    void cleanImport_isImportedWithoutWarnings_andImportXyzIsUnchanged() {
        TerrainImportResult r = service.importXyzWithDiagnostics("p", "f.xyz", "L", SQUARE);
        assertEquals(TerrainStatus.IMPORTED, r.terrain().status());
        assertTrue(r.warnings().isEmpty());
        assertEquals(4, r.terrain().vertices().size());
        assertEquals(2, r.terrain().triangles().size());
        assertEquals(TerrainStatus.IMPORTED, service.importXyz("p", "f.xyz", "L", SQUARE).status());
    }

    @Test
    void conflictingZAtTheSameXy_isReviewRequired_andKeepsTheFirstValue() {
        TerrainImportResult r = service.importXyzWithDiagnostics("p", "f.xyz", "L", SQUARE + "0 0 99\n10 10 4\n");
        assertEquals(TerrainStatus.REVIEW_REQUIRED, r.terrain().status());
        assertEquals(1, r.warnings().size(), "an identical repeated point is not a conflict; only (0,0) conflicts");
        assertTrue(r.warnings().get(0).startsWith("1 location(s)"));
        assertEquals(1.0, r.terrain().vertices().get(0).z(), 0);
        assertEquals(4, r.terrain().vertices().size());
    }

    @Test
    void identicalDuplicates_areNotAConflict() {
        TerrainImportResult r = service.importXyzWithDiagnostics("p", "f.xyz", "L", SQUARE + "0 0 1\n");
        assertEquals(TerrainStatus.IMPORTED, r.terrain().status());
        assertTrue(r.warnings().isEmpty());
    }

    @Test
    void fewerThanThreeDistinctPoints_orCollinearPoints_areReviewRequired() {
        TerrainImportResult two = service.importXyzWithDiagnostics("p", "f.xyz", "L", "0 0 1\n10 0 2\n0 0 5\n");
        assertEquals(TerrainStatus.REVIEW_REQUIRED, two.terrain().status());
        assertTrue(two.warnings().stream().anyMatch(w -> w.contains("distinct point")));
        assertEquals(0, two.terrain().triangles().size());

        TerrainImportResult collinear = service.importXyzWithDiagnostics("p", "f.xyz", "L", "0 0 1\n5 0 2\n10 0 3\n");
        assertEquals(TerrainStatus.REVIEW_REQUIRED, collinear.terrain().status());
        assertEquals(0, collinear.terrain().triangles().size());
    }

    @Test
    void wideRows_areReviewRequired() {
        TerrainImportResult r = service.importXyzWithDiagnostics("p", "f.xyz", "L", "0 0 1 7\n10 0 2 7\n0 10 3 7\n");
        assertEquals(TerrainStatus.REVIEW_REQUIRED, r.terrain().status());
        assertTrue(r.warnings().get(0).contains("more than three numeric columns"));
    }

    @Test
    void nonFiniteRows_areSkippedAndCounted_withoutChangingTheStatus() {
        TerrainImportResult r = service.importXyzWithDiagnostics("p", "f.xyz", "L", SQUARE + "NaN 3 3\n");
        assertEquals(TerrainStatus.IMPORTED, r.terrain().status());
        assertEquals(1, r.warnings().size());
        assertTrue(r.warnings().get(0).startsWith("1 row(s)"));
        assertEquals(4, r.terrain().vertices().size());
    }

    @Test
    void elevationQuery_withNonFiniteCoordinates_isEmpty() {
        TerrainModel terrain = service.importXyz("p", "f.xyz", "L", SQUARE);
        assertTrue(query.getElevation(terrain, Double.NaN, 5).isEmpty());
        assertTrue(query.getElevation(terrain, 5, Double.NaN).isEmpty());
        assertTrue(query.getElevation(terrain, Double.POSITIVE_INFINITY, 5).isEmpty());
        assertFalse(query.getElevation(terrain, 5, 5).isEmpty());
        assertEquals(2.5, query.getElevation(terrain, 5, 5).orElseThrow(), 1e-9);
    }
}
