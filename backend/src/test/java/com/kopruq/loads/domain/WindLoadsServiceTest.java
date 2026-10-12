package com.kopruq.loads.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import com.kopruq.loads.model.WindRequest;
import com.kopruq.loads.model.WindResult;

/**
 * BACKEND-REMEDIATION Faz 1. Valid-input expectations are a CHARACTERIZATION
 * of the current service output (not an engineering validation); the INVALID
 * cases are the new input-domain guards.
 */
class WindLoadsServiceTest {

    private final WindLoadsService service = new WindLoadsService();

    private static WindRequest req(Double vb, String cat, Double ze, Double b, Double dref) {
        return new WindRequest(vb, cat, ze, b, dref);
    }

    private void assertInvalid(WindRequest r) {
        WindResult result = service.resolve(r);
        assertEquals("INVALID", result.status());
        assertNull(result.transverseKNm());
        assertNotNull(result.missing());
    }

    @Test
    void terrainII_snapshot() {
        WindResult r = service.resolve(req(27.0, "II", 10.0, 13.8, 2.5));
        assertEquals("VALID", r.status());
        assertEquals(0.05, r.z0M(), 0);
        assertEquals(2.0, r.zminM(), 0);
        assertEquals(1.0066802996441269, r.cr(), 1e-12);
        assertEquals(1.0717621422844528, r.qpKNm2(), 1e-12);
        assertEquals(3.483226962424472, r.transverseKNm(), 1e-12);
        assertNull(r.missing());
    }

    @Test
    void allFiveTerrainCategories_areValidWithTheirRoughnessLength() {
        String[] cats = {"0", "I", "II", "III", "IV"};
        double[] z0 = {.003, .01, .05, .3, 1};
        for (int i = 0; i < cats.length; i++) {
            WindResult r = service.resolve(req(27.0, cats[i], 12.0, 13.8, 2.5));
            assertEquals("VALID", r.status(), cats[i]);
            assertEquals(z0[i], r.z0M(), 0, cats[i]);
        }
    }

    @Test
    void invalidTerrainCategory_isInvalid_notAnException() {
        for (String cat : new String[] {null, "", "V", "ii", "2"}) {
            WindResult r = service.resolve(req(27.0, cat, 10.0, 13.8, 2.5));
            assertEquals("INVALID", r.status(), String.valueOf(cat));
            assertEquals("invalid terrain category", r.missing());
        }
    }

    @Test
    void nonFiniteInputs_areInvalid() {
        assertInvalid(req(Double.NaN, "II", 10.0, 13.8, 2.5));
        assertInvalid(req(Double.POSITIVE_INFINITY, "II", 10.0, 13.8, 2.5));
        assertInvalid(req(27.0, "II", Double.NaN, 13.8, 2.5));
        assertInvalid(req(27.0, "II", Double.POSITIVE_INFINITY, 13.8, 2.5));
        assertInvalid(req(27.0, "II", 10.0, Double.NaN, 2.5));
        assertInvalid(req(27.0, "II", 10.0, Double.NEGATIVE_INFINITY, 2.5));
        assertInvalid(req(27.0, "II", 10.0, 13.8, Double.NaN));
        assertInvalid(req(27.0, "II", 10.0, 13.8, Double.POSITIVE_INFINITY));
    }

    @Test
    void negativeReferenceHeight_andNonPositiveDeckWidth_areInvalid() {
        assertInvalid(req(27.0, "II", -1.0, 13.8, 2.5));
        assertInvalid(req(27.0, "II", 10.0, 0.0, 2.5));
        assertInvalid(req(27.0, "II", 10.0, -3.0, 2.5));
    }

    @Test
    void missingFieldsAndNullRequest_areInvalid() {
        assertInvalid(null);
        assertInvalid(req(null, "II", 10.0, 13.8, 2.5));
        assertInvalid(req(27.0, "II", null, 13.8, 2.5));
        assertInvalid(req(27.0, "II", 10.0, null, 2.5));
        assertInvalid(req(27.0, "II", 10.0, 13.8, null));
        assertInvalid(req(0.0, "II", 10.0, 13.8, 2.5));
        assertInvalid(req(27.0, "II", 10.0, 13.8, 0.0));
    }

    @Test
    void zeroReferenceHeight_staysValid_unchangedBehavior() {
        // ze = 0 is clamped to zmin by the existing rule; only ze < 0 is rejected.
        assertEquals("VALID", service.resolve(req(27.0, "II", 0.0, 13.8, 2.5)).status());
    }
}
