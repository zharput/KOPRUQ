package com.kopruq.trafficloads;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds LM1's code-default parameter set (TRAFFIC-P01, docs/roadmap.md)
 * - only the engineer-confirmed part is pre-filled: adjustment factors
 * default to 1.00 (base EN, no National Annex adjustment -
 * docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md's P07 scope-agreement round).
 * EN 1991-2 base LM1 values (4.3.2 / Table 4.2) are code defaults;
 * adjustment factors remain editable project values and default to 1.00.
 */
public final class Lm1DefaultsFactory {

    private static final double CONFIRMED_ADJUSTMENT_FACTOR = 1.00;

    public Lm1Parameters codeDefaults(int laneCount) {
        int rowCount = Math.max(0, Math.min(laneCount, 3));
        List<LaneFactor> tandemSystem = new ArrayList<>(rowCount);
        List<LaneFactor> udl = new ArrayList<>(rowCount);
        for (int i = 1; i <= rowCount; i++) {
            tandemSystem.add(new LaneFactor("Q" + i + "k", codeValue(tandemBase(i)), baseFactor()));
            udl.add(new LaneFactor("q" + i + "k", codeValue(udlBase(i)), baseFactor()));
        }
        LaneFactor remainingAreaUdl = new LaneFactor("qrk", codeValue(2.5), baseFactor());
        return new Lm1Parameters(tandemSystem, udl, remainingAreaUdl);
    }

    private static double tandemBase(int lane) { return switch (lane) { case 1 -> 300.0; case 2 -> 200.0; default -> 100.0; }; }
    private static double udlBase(int lane) { return lane == 1 ? 9.0 : 2.5; }
    private static ParameterValue<Double> codeValue(double value) {
        return new ParameterValue<>(value, ParameterProvenance.CODE_DEFAULT, value);
    }

    private static ParameterValue<Double> baseFactor() {
        return new ParameterValue<>(CONFIRMED_ADJUSTMENT_FACTOR, ParameterProvenance.CODE_DEFAULT, CONFIRMED_ADJUSTMENT_FACTOR);
    }
}
