package com.kopruq.loads.domain;

import java.util.ArrayList;
import java.util.List;
import com.kopruq.loads.model.SeismicSpectrumRequest;
import com.kopruq.loads.model.SeismicSpectrumResult;

/**
 * Elastic response spectrum. The parameter tables are carried over
 * unchanged from the earlier single-line implementation (BACKEND-REMEDIATION
 * Faz 1 only made the code readable and fail-closed); their provenance is an
 * open engineer question and nothing here validates them.
 *
 * <p>Fail-closed input rules: {@code spectrumType} must be exactly
 * {@code "Type 1"} or {@code "Type 2"}; {@code groundType} must be exactly one
 * of the single letters {@code A}-{@code E}; {@code agR} and
 * {@code importanceFactor} must be finite and positive. Anything else returns
 * an {@code INVALID} result with no points - never a silent fallback table.
 */
public final class SeismicSpectrumService {

    private static final String GROUND_TYPES = "ABCDE";

    /** Rows A-E, columns S, TB, TC, TD. */
    private static final double[][] TYPE_1 = {
            {1, .15, .4, 2}, {1.2, .15, .5, 2}, {1.15, .2, .6, 2}, {1.35, .2, .8, 2}, {1.4, .15, .5, 2}};
    private static final double[][] TYPE_2 = {
            {1, .05, .25, 1.2}, {1.35, .05, .25, 1.2}, {1.5, .1, .25, 1.2}, {1.8, .1, .3, 1.2}, {1.6, .05, .25, 1.2}};

    public SeismicSpectrumResult resolve(SeismicSpectrumRequest r) {
        if (r == null || !positiveFinite(r.agR()) || !positiveFinite(r.importanceFactor())) {
            return invalid();
        }
        double[][] table = tableFor(r.spectrumType());
        int groundIndex = groundIndex(r.groundType());
        if (table == null || groundIndex < 0) {
            return invalid();
        }

        double ag = r.agR() * r.importanceFactor();
        double s = table[groundIndex][0];
        double tb = table[groundIndex][1];
        double tc = table[groundIndex][2];
        double td = table[groundIndex][3];

        List<SeismicSpectrumResult.Point> points = new ArrayList<>();
        for (int n = 0; n <= 400; n++) {
            double t = n * .01;
            double se = ag * s * (t <= tb ? 1 + t / tb * 1.5 : t <= tc ? 2.5 : t <= td ? 2.5 * tc / t : 2.5 * tc * td / (t * t));
            points.add(new SeismicSpectrumResult.Point(t, se));
        }
        return new SeismicSpectrumResult("VALID", ag, s, tb, tc, td, ag * s * 2.5, points);
    }

    private static double[][] tableFor(String spectrumType) {
        if ("Type 1".equals(spectrumType)) {
            return TYPE_1;
        }
        if ("Type 2".equals(spectrumType)) {
            return TYPE_2;
        }
        return null;
    }

    private static int groundIndex(String groundType) {
        if (groundType == null || groundType.length() != 1) {
            return -1;
        }
        return GROUND_TYPES.indexOf(groundType.charAt(0));
    }

    private static boolean positiveFinite(Double value) {
        return value != null && Double.isFinite(value) && value > 0;
    }

    private static SeismicSpectrumResult invalid() {
        return new SeismicSpectrumResult("INVALID", 0, 0, 0, 0, 0, 0, List.of());
    }
}
