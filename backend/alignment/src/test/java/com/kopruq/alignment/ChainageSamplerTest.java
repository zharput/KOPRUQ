package com.kopruq.alignment;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

/**
 * BACKEND-REMEDIATION Faz 10: the two sampling rules moved out of the controllers unchanged. The reference
 * implementations below are verbatim copies of the loops that used to live in {@code AlignmentController} and
 * {@code LandXmlController}; the sampler must reproduce them bit for bit.
 */
class ChainageSamplerTest {

    private final ChainageSampler sampler = new ChainageSampler();

    // ---- verbatim copies of the pre-extraction loops (the oracle)

    private static List<Double> oldOverlay(double totalLengthM, double requestedStepM) {
        double stepM = requestedStepM > 0 ? requestedStepM : Math.max(totalLengthM / 20, 1);
        List<Double> out = new ArrayList<>();
        double chainageM = 0;
        while (chainageM < totalLengthM) {
            out.add(chainageM);
            chainageM += stepM;
        }
        out.add(totalLengthM);
        return out;
    }

    private static List<Double> oldProfile(double totalLengthM, double stepM) {
        double effectiveStepM = stepM > 0 ? stepM : Math.max(totalLengthM / 50, 1);
        List<Double> out = new ArrayList<>();
        double chainageM = 0;
        while (chainageM <= totalLengthM) {
            out.add(chainageM);
            chainageM += effectiveStepM;
        }
        if (chainageM - effectiveStepM < totalLengthM) {
            out.add(totalLengthM);
        }
        return out;
    }

    @Test
    void overlayRule_reproducesTheOldLoopExactly() {
        Random random = new Random(42);
        double[][] cases = {{100, 25}, {100, 0}, {178.53981633974485, 0}, {1, 0.1}, {0, 0}, {0, 5}, {10, 3}, {10, 10}, {7.5, -1}};
        for (double[] c : cases) {
            assertEquals(oldOverlay(c[0], c[1]), sampler.forOverlay(c[0], c[1]), "L=" + c[0] + " step=" + c[1]);
        }
        for (int i = 0; i < 300; i++) {
            double length = random.nextDouble() * 500;
            double step = random.nextBoolean() ? 0 : random.nextDouble() * 20 + 0.01;
            assertEquals(oldOverlay(length, step), sampler.forOverlay(length, step));
        }
    }

    @Test
    void profileRule_reproducesTheOldLoopExactly() {
        Random random = new Random(7);
        double[][] cases = {{100, 25}, {100, 0}, {178.53981633974485, 50}, {178.53981633974485, 0}, {1, 0.1}, {0, 0}, {10, 10}, {10, 3}};
        for (double[] c : cases) {
            assertEquals(oldProfile(c[0], c[1]), sampler.forProfile(c[0], c[1]), "L=" + c[0] + " step=" + c[1]);
        }
        for (int i = 0; i < 300; i++) {
            double length = random.nextDouble() * 500;
            double step = random.nextBoolean() ? 0 : random.nextDouble() * 20 + 0.01;
            assertEquals(oldProfile(length, step), sampler.forProfile(length, step));
        }
    }

    @Test
    void theTwoRulesStayDifferent_noMergeWasDone() {
        // L = 100, step 50: overlay stops below L and appends it; profile includes L in the loop and appends nothing more.
        assertEquals(List.of(0.0, 50.0, 100.0), sampler.forOverlay(100, 50));
        assertEquals(List.of(0.0, 50.0, 100.0), sampler.forProfile(100, 50));
        // default steps differ: L/20 vs L/50 (both at least 1)
        assertEquals(21, sampler.forOverlay(100, 0).size());
        assertEquals(51, sampler.forProfile(100, 0).size());
    }

    @Test
    void aStepTooSmallToAdvance_isRejected_notLooped() {
        assertTimeoutPreemptively(Duration.ofSeconds(5), () -> {
            assertThrows(IllegalArgumentException.class, () -> sampler.forOverlay(1.0e9, 1e-300));
            assertThrows(IllegalArgumentException.class, () -> sampler.forProfile(1.0e9, 1e-10));
            assertThrows(IllegalArgumentException.class, () -> sampler.forOverlay(100, 1e-300));
            assertThrows(IllegalArgumentException.class, () -> sampler.forProfile(100, 1e-300));
        });
    }

    @Test
    void nonFiniteInputs_areRejected() {
        assertThrows(IllegalArgumentException.class, () -> sampler.forOverlay(Double.NaN, 5));
        assertThrows(IllegalArgumentException.class, () -> sampler.forProfile(Double.POSITIVE_INFINITY, 5));
        assertThrows(IllegalArgumentException.class, () -> sampler.forOverlay(100, Double.POSITIVE_INFINITY));
        assertThrows(IllegalArgumentException.class, () -> sampler.forOverlay(-1, 5));
    }
}
