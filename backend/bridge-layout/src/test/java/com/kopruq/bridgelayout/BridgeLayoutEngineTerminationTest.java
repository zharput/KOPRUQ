package com.kopruq.bridgelayout;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.StraightElement;
import com.kopruq.constraints.NoPierZone;
import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 6: the layout engine must always terminate (correct result or
 * IllegalArgumentException) and its records must reject non-finite numbers.
 */
class BridgeLayoutEngineTerminationTest {

    private static final Duration LIMIT = Duration.ofSeconds(10);

    private static Alignment alignment(double length) {
        return new Alignment(List.of(new StraightElement(new Point3D(0, 0, 0), new Point3D(length, 0, 0))));
    }

    private static List<BridgeLayoutAlternative> generate(BridgeSite site, LayoutDesignSpace space) {
        return assertTimeoutPreemptively(LIMIT,
                () -> new BridgeLayoutEngine().generate(alignment(100), site, List.of(), space));
    }

    private static BridgeSite site(double start, double end) {
        return new BridgeSite("S", "site", start, end, "River");
    }

    @Test
    void c1StepBelowUlpOfTheStartChainage_isRejected_notLooped() {
        // 50 + 1e-300 == 50: "c1 += step" never advanced.
        var e = assertThrows(IllegalArgumentException.class,
                () -> generate(site(50, 100), new LayoutDesignSpace(30, 50, 2, 3, 10, 1e-300)));
        assertTrue(e.getMessage().contains("c1StepM"), e.getMessage());
    }

    @Test
    void c1StepProducingMoreStepsThanAnIntCanCount_isRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> generate(site(0, 100), new LayoutDesignSpace(30, 50, 2, 3, 10, 1e-300)));
    }

    @Test
    void spanLengthStepBelowUlp_isRejected_notLooped() {
        assertThrows(IllegalArgumentException.class,
                () -> generate(site(0, 100), new LayoutDesignSpace(30, 50, 2, 3, 1e-17, 100)));
        assertThrows(IllegalArgumentException.class,
                () -> generate(site(0, 100), new LayoutDesignSpace(30, 50, 2, 3, 1e-300, 100)));
    }

    @Test
    void spanCountAtIntegerMax_terminates() {
        // An int span-count counter wrapped around at Integer.MAX_VALUE and never ended.
        var result = generate(site(0, 100),
                new LayoutDesignSpace(30, 50, Integer.MAX_VALUE - 1, Integer.MAX_VALUE, 10, 100));
        assertTrue(result.isEmpty(), "that many spans cannot fit a 100 m site");
    }

    @Test
    void indexBasedWalk_keepsTheSameResultAsTheAccumulatingLoop() {
        // C1 in {0,25,50,75,100}, span count 2..3, span length {30,40,50}: hand-count of fitting arrangements.
        var result = generate(site(0, 100), new LayoutDesignSpace(30, 50, 2, 3, 10, 25));
        // C1=0: 4 (as in BridgeLayoutEngineTest); C1=25: (2x30=55,2x40=105x,3x30=115x,2x50=125x) -> 1 => 55 fits(<=100)
        // C1=50: 2x30 -> 110 > 100: none; so 4 + 1
        assertEquals(5, result.size());
        assertEquals("LAYOUT-5", result.get(4).id());
        assertEquals(25.0, result.get(4).c1().chainageM(), 1e-9);
    }

    @Test
    void nonFiniteRecords_cannotBeConstructed() {
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new BridgeSite("S", "n", bad, 100, "River"));
            assertThrows(IllegalArgumentException.class, () -> new BridgeSite("S", "n", 0, bad, "River"));
            assertThrows(IllegalArgumentException.class, () -> new NoPierZone("Z", bad, 10, "d"));
            assertThrows(IllegalArgumentException.class, () -> new NoPierZone("Z", 0, bad, "d"));
            assertThrows(IllegalArgumentException.class, () -> new LayoutDesignSpace(bad, 50, 2, 3, 10, 100));
            assertThrows(IllegalArgumentException.class, () -> new LayoutDesignSpace(30, bad, 2, 3, 10, 100));
            assertThrows(IllegalArgumentException.class, () -> new LayoutDesignSpace(30, 50, 2, 3, bad, 100));
            assertThrows(IllegalArgumentException.class, () -> new LayoutDesignSpace(30, 50, 2, 3, 10, bad));
        }
    }

    @Test
    void finiteRecords_stillConstruct_includingAnInvertedSpanRangeThatTheEngineRejects() {
        var inverted = new LayoutDesignSpace(50, 10, 2, 3, 10, 100);
        assertThrows(IllegalArgumentException.class, () -> generate(site(0, 100), inverted));
    }
}
