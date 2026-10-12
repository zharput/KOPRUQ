package com.kopruq.loads.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import com.kopruq.loads.model.SeismicSpectrumRequest;
import com.kopruq.loads.model.SeismicSpectrumResult;

/**
 * BACKEND-REMEDIATION Faz 1. The parameter table below is a CHARACTERIZATION
 * snapshot of the values already present in {@link SeismicSpectrumService}
 * (rows: ground types A-E; columns: S, TB, TC, TD). It is NOT an engineering
 * validation of those values - their provenance is an open engineer question.
 */
class SeismicSpectrumServiceTest {

    private static final double[][] TYPE1 = {
            {1, .15, .4, 2}, {1.2, .15, .5, 2}, {1.15, .2, .6, 2}, {1.35, .2, .8, 2}, {1.4, .15, .5, 2}};
    private static final double[][] TYPE2 = {
            {1, .05, .25, 1.2}, {1.35, .05, .25, 1.2}, {1.5, .1, .25, 1.2}, {1.8, .1, .3, 1.2}, {1.6, .05, .25, 1.2}};
    private static final String GROUNDS = "ABCDE";

    private final SeismicSpectrumService service = new SeismicSpectrumService();

    private static SeismicSpectrumResult invalid(SeismicSpectrumResult r) {
        assertEquals("INVALID", r.status());
        assertTrue(r.points().isEmpty());
        return r;
    }

    @Test
    void allTenValidCombinations_matchTheSnapshotTable() {
        for (String type : List.of("Type 1", "Type 2")) {
            double[][] table = type.equals("Type 1") ? TYPE1 : TYPE2;
            for (int i = 0; i < 5; i++) {
                String ground = String.valueOf(GROUNDS.charAt(i));
                var r = service.resolve(new SeismicSpectrumRequest(0.25, 1.2, ground, type));
                String what = type + "/" + ground;
                assertEquals("VALID", r.status(), what);
                assertEquals(0.25 * 1.2, r.ag(), 1e-12, what);
                assertEquals(table[i][0], r.s(), 0, what);
                assertEquals(table[i][1], r.tb(), 0, what);
                assertEquals(table[i][2], r.tc(), 0, what);
                assertEquals(table[i][3], r.td(), 0, what);
                assertEquals(0.3 * table[i][0] * 2.5, r.peakElasticAcceleration(), 1e-12, what);
                assertEquals(401, r.points().size(), what);
                // plateau value at T = TC, and the descending branch beyond TD
                double ag = 0.3, s = table[i][0], tc = table[i][2], td = table[i][3];
                int plateauIdx = (int) Math.round(tc * 100);
                assertEquals(ag * s * 2.5, r.points().get(plateauIdx).acceleration(), 1e-12, what);
                double t = 4.0;
                assertEquals(ag * s * 2.5 * tc * td / (t * t), r.points().get(400).acceleration(), 1e-12, what);
            }
        }
    }

    @Test
    void unrecognizedSpectrumType_isInvalid() {
        for (String type : new String[] {null, "type 2", "Type 3", "", "Type 1 "}) {
            invalid(service.resolve(new SeismicSpectrumRequest(0.2, 1.0, "A", type)));
        }
    }

    @Test
    void unrecognizedGroundType_isInvalid() {
        for (String ground : new String[] {null, "", "AB", "a", "F", "ABCDE", " "}) {
            invalid(service.resolve(new SeismicSpectrumRequest(0.2, 1.0, ground, "Type 1")));
        }
    }

    @Test
    void nonPositiveOrNonFiniteInputs_areInvalid() {
        invalid(service.resolve(null));
        invalid(service.resolve(new SeismicSpectrumRequest(null, 1.0, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(0.2, null, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(0.0, 1.0, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(0.2, -1.0, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(Double.NaN, 1.0, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(Double.POSITIVE_INFINITY, 1.0, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(0.2, Double.NaN, "A", "Type 1")));
        invalid(service.resolve(new SeismicSpectrumRequest(0.2, Double.POSITIVE_INFINITY, "A", "Type 1")));
    }
}
