package com.spanova.trafficloads;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds LM1's code-default parameter set (TRAFFIC-P01, docs/roadmap.md)
 * - only the engineer-confirmed part is pre-filled: adjustment factors
 * default to 1.00 (base EN, no National Annex adjustment -
 * docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md's P07 scope-agreement round).
 * The EN 1991-2 Table 4.2 characteristic values themselves (Q1k, Q2k,
 * Q3k, q1k, q2k, q3k, qrk) are NOT filled in - spec section 22, never
 * invented from memory - they stay {@code null} until the engineer
 * supplies them or a validated SPANOVA code-data source exists.
 */
public final class Lm1DefaultsFactory {

    private static final double CONFIRMED_ADJUSTMENT_FACTOR = 1.00;

    public Lm1Parameters codeDefaults(int laneCount) {
        int rowCount = Math.max(0, Math.min(laneCount, 3));
        List<LaneFactor> tandemSystem = new ArrayList<>(rowCount);
        List<LaneFactor> udl = new ArrayList<>(rowCount);
        for (int i = 1; i <= rowCount; i++) {
            tandemSystem.add(new LaneFactor("Lane " + i + " - Tandem System (Q" + i + "k)", unconfirmed(), confirmedFactor()));
            udl.add(new LaneFactor("Lane " + i + " - UDL (q" + i + "k)", unconfirmed(), confirmedFactor()));
        }
        LaneFactor remainingAreaUdl = new LaneFactor("Remaining Area - UDL (qrk)", unconfirmed(), confirmedFactor());
        return new Lm1Parameters(tandemSystem, udl, remainingAreaUdl);
    }

    private static ParameterValue<Double> unconfirmed() {
        return new ParameterValue<>(null, ParameterProvenance.CODE_DEFAULT, null);
    }

    private static ParameterValue<Double> confirmedFactor() {
        return new ParameterValue<>(CONFIRMED_ADJUSTMENT_FACTOR, ParameterProvenance.NATIONAL_ANNEX, CONFIRMED_ADJUSTMENT_FACTOR);
    }
}
