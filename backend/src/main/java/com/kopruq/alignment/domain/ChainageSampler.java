package com.kopruq.alignment.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Chooses the chainages at which an alignment is sampled. There are TWO sampling rules, kept exactly as they were
 * when they lived inside {@code AlignmentController} and {@code LandXmlController} (whether they should be one rule
 * is an open decision and is NOT made here):
 *
 * <ul>
 *   <li>{@link #forOverlay}: default step {@code max(L/20, 1)}; chainages {@code 0, s, 2s ...} while strictly below
 *       {@code L}, then {@code L} itself - the 3D viewer's alignment overlay.</li>
 *   <li>{@link #forProfile}: default step {@code max(L/50, 1)}; chainages {@code 0, s, 2s ...} while at most
 *       {@code L}, then {@code L} itself unless the last chainage already reached it - the longitudinal profile chart.</li>
 * </ul>
 *
 * Both accumulate {@code chainage += step} exactly as before (so existing outputs are bit-identical). What is new is
 * a guard: a step too small to move the chainage (below the floating-point spacing at {@code L}) or one that would
 * need more points than an int can count is rejected instead of looping forever.
 */
public class ChainageSampler {

    /** Overlay rule (strict {@code <}, default {@code L/20}). */
    public List<Double> forOverlay(double totalLengthM, double requestedStepM) {
        double stepM = requestedStepM > 0 ? requestedStepM : Math.max(totalLengthM / 20, 1);
        requireProgress(totalLengthM, stepM);

        List<Double> chainages = new ArrayList<>();
        double chainageM = 0;
        while (chainageM < totalLengthM) {
            chainages.add(chainageM);
            chainageM += stepM;
        }
        chainages.add(totalLengthM);
        return chainages;
    }

    /** Profile rule (inclusive {@code <=}, default {@code L/50}, conditional end point). */
    public List<Double> forProfile(double totalLengthM, double requestedStepM) {
        double stepM = requestedStepM > 0 ? requestedStepM : Math.max(totalLengthM / 50, 1);
        requireProgress(totalLengthM, stepM);

        List<Double> chainages = new ArrayList<>();
        double chainageM = 0;
        while (chainageM <= totalLengthM) {
            chainages.add(chainageM);
            chainageM += stepM;
        }
        if (chainageM - stepM < totalLengthM) {
            chainages.add(totalLengthM);
        }
        return chainages;
    }

    private static void requireProgress(double totalLengthM, double stepM) {
        if (!Double.isFinite(totalLengthM) || totalLengthM < 0) {
            throw new IllegalArgumentException("The alignment length must be a finite number >= 0, got " + totalLengthM);
        }
        if (!Double.isFinite(stepM) || !(totalLengthM + stepM > totalLengthM)) {
            throw new IllegalArgumentException("stepM is too small (or not finite) to advance along an alignment of "
                    + totalLengthM + " m");
        }
        if (!(totalLengthM / stepM < Integer.MAX_VALUE)) {
            throw new IllegalArgumentException("stepM would produce more sample points than can be represented");
        }
    }
}
