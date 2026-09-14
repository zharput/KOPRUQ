package com.spanova.landxml;

import com.spanova.alignment.ChainagePosition;
import com.spanova.spatialcore.Point3D;
import com.spanova.terrain.TerrainQueryService;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end LANDXML-P01 verification: parse the fixture, commit the
 * selected surface/alignment, and confirm the resulting SPANOVA domain
 * objects behave correctly - "compare selected terrain elevations
 * against source DTM values", "alignment coordinates at known
 * chainages", "profile elevations at known chainages" (the engineer's
 * own validation checklist).
 */
class LandXmlImportServiceTest {

    private static final double EPS = 1e-6;

    private final LandXmlImportService service = new LandXmlImportService();
    private final TerrainQueryService terrainQueryService = new TerrainQueryService();

    private static InputStream sampleFile() {
        InputStream stream = LandXmlImportServiceTest.class.getResourceAsStream("/sample.landxml");
        if (stream == null) {
            throw new IllegalStateException("test fixture sample.landxml not found on classpath");
        }
        return stream;
    }

    @Test
    void commit_buildsATerrainModelWithThePreservedTinFaces() {
        LandXmlImportResult result = service.commit(
                sampleFile(), "proj-1", "sample.landxml", "Local/Unknown", "Existing Ground", null);

        assertEquals(4, result.terrain().vertices().size());
        assertEquals(2, result.terrain().triangles().size(), "the source file's own 2 faces must be preserved, not re-triangulated");

        Optional<Double> elevation = terrainQueryService.getElevation(result.terrain(), 5, 5);
        assertTrue(elevation.isPresent());
        assertEquals(6.0, elevation.get(), EPS); // z = 2 + 0.5*5 + 0.3*5, same planar surface as backend/terrain's own test
    }

    @Test
    void commit_buildsARealAlignmentWithLineAndCurveElements() {
        LandXmlImportResult result = service.commit(
                sampleFile(), "proj-1", "sample.landxml", "Local/Unknown", "Existing Ground", "Main Alignment");

        assertNotNull(result.alignment());
        assertEquals(100 + 50 * Math.PI / 2, result.alignment().totalLengthM(), 1e-3);

        Point3D atStart = result.alignment().toXYZ(new ChainagePosition(0, 0, 0));
        assertEquals(0, atStart.x(), EPS);
        assertEquals(0, atStart.y(), EPS);

        Point3D atLineEnd = result.alignment().toXYZ(new ChainagePosition(100, 0, 0));
        assertEquals(100, atLineEnd.x(), EPS);
        assertEquals(0, atLineEnd.y(), EPS);

        Point3D atCurveEnd = result.alignment().toXYZ(new ChainagePosition(result.alignment().totalLengthM(), 0, 0));
        assertEquals(150, atCurveEnd.x(), 1e-3);
        assertEquals(50, atCurveEnd.y(), 1e-3);
    }

    @Test
    void commit_buildsARealVerticalProfileMatchingHandComputedElevations() {
        LandXmlImportResult result = service.commit(
                sampleFile(), "proj-1", "sample.landxml", "Local/Unknown", "Existing Ground", "Main Alignment");

        assertNotNull(result.profile());
        assertEquals(100, result.profile().elevationAt(0), EPS);
        assertEquals(102.5, result.profile().elevationAt(50), EPS);
        assertEquals(104, result.profile().elevationAt(80), EPS); // BVC of the parabolic vertical curve
        assertEquals(104.5, result.profile().elevationAt(100), EPS); // at the PVI itself
        assertEquals(100, result.profile().elevationAt(200), EPS);
    }

    @Test
    void commit_alignmentToXYZ_withVerticalProfile_derivesElevationFromTheProfile() {
        LandXmlImportResult result = service.commit(
                sampleFile(), "proj-1", "sample.landxml", "Local/Unknown", "Existing Ground", "Main Alignment");

        Point3D p = result.alignment().toXYZ(50, 0, result.profile());
        assertEquals(50, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
        assertEquals(102.5, p.z(), EPS);
    }

    @Test
    void commit_surfaceOnly_leavesAlignmentAndProfileNull() {
        LandXmlImportResult result = service.commit(
                sampleFile(), "proj-1", "sample.landxml", "Local/Unknown", "Existing Ground", null);

        assertEquals(null, result.alignment());
        assertEquals(null, result.profile());
    }

    @Test
    void inspect_reportsTheSurfaceAndAlignmentNamesForThePreviewScreen() {
        LandXmlDocument document = service.inspect(sampleFile());

        assertEquals(1, document.surfaces().size());
        assertEquals("Existing Ground", document.surfaces().get(0).name());
        assertEquals(1, document.alignments().size());
        assertEquals("Main Alignment", document.alignments().get(0).name());
    }
}
