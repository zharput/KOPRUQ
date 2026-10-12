package com.kopruq.generative;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.DesignSpace;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 6: the generator must always terminate - with a correct result or an
 * IllegalArgumentException - for integer-limit and sub-ULP inputs. Every call is time-boxed.
 */
class AlternativeGeneratorTerminationTest {

    private static final Duration LIMIT = Duration.ofSeconds(10);

    private static DesignSpace space(double minSpan, double maxSpan, int minGirders, int maxGirders,
            double minDepth, double maxDepth, double depthStep) {
        return new DesignSpace(minSpan, maxSpan, minGirders, maxGirders, 0, 0, minDepth, maxDepth, 0, 0, 0, 0, 0, 0, depthStep);
    }

    private List<?> generate(Bridge bridge, DesignSpace space) {
        return assertTimeoutPreemptively(LIMIT, () -> new AlternativeGenerator().generate(bridge, space));
    }

    @Test
    void girderCountAtIntegerMax_terminates_withBothCounts() {
        // An int loop counter wrapped around at Integer.MAX_VALUE and never ended.
        var result = generate(new Bridge("b", 210, 13.8),
                space(30, 45, Integer.MAX_VALUE - 1, Integer.MAX_VALUE, 1.8, 1.8, 0.1));
        // spanCounts {5,6,7} x 2 girder counts x 1 depth
        assertEquals(3 * 2 * 1, result.size());
    }

    @Test
    void spanCountBeyondIntRange_isRejected_notLooped() {
        var tooMany = new Bridge("b", 3.0e9, 13.8);
        assertThrows(IllegalArgumentException.class, () -> generate(tooMany, space(1, 1.0e9, 4, 4, 1.8, 1.8, 0.1)));
        var hugeLength = new Bridge("b", 1.0e300, 13.8);
        var e = assertThrows(IllegalArgumentException.class, () -> generate(hugeLength, space(30, 45, 4, 4, 1.8, 1.8, 0.1)));
        assertTrue(e.getMessage().contains("cannot be represented"), e.getMessage());
    }

    @Test
    void girderDepthStepBelowUlp_isRejected_notLooped() {
        var bridge = new Bridge("b", 210, 13.8);
        assertThrows(IllegalArgumentException.class, () -> generate(bridge, space(30, 45, 4, 8, 1.8, 2.5, 1e-300)));
        // 1.8 + 1e-17 == 1.8 in double arithmetic: "depth += step" would never advance.
        assertThrows(IllegalArgumentException.class, () -> generate(bridge, space(30, 45, 4, 8, 1.8, 2.5, 1e-17)));
    }

    @Test
    void girderDepthStepGivingMoreDepthsThanAnIntCanCount_isRejected() {
        var bridge = new Bridge("b", 210, 13.8);
        assertThrows(IllegalArgumentException.class, () -> generate(bridge, space(30, 45, 4, 8, 1.0, 1.0e6, 1e-6)));
    }

    @Test
    void depthsAreIndexBased_andKeepTheSameInclusiveResultAsBefore() {
        // 1.8 .. 2.5 step 0.1 -> 8 depths including both ends (same as the pre-change accumulating loop).
        var result = new AlternativeGenerator().generate(new Bridge("b", 210, 13.8), space(30, 45, 4, 4, 1.8, 2.5, 0.1));
        var depths = result.stream().filter(a -> a.spanLayout().spans().size() == 5)
                .map(a -> a.girder().depthM()).toList();
        assertEquals(List.of(1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5), depths);
    }

    @Test
    void nonFiniteDesignSpaceOrBridge_cannotBeConstructed() {
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> space(bad, 45, 4, 8, 1.8, 2.5, 0.1));
            assertThrows(IllegalArgumentException.class, () -> space(30, bad, 4, 8, 1.8, 2.5, 0.1));
            assertThrows(IllegalArgumentException.class, () -> space(30, 45, 4, 8, bad, 2.5, 0.1));
            assertThrows(IllegalArgumentException.class, () -> space(30, 45, 4, 8, 1.8, bad, 0.1));
            assertThrows(IllegalArgumentException.class, () -> space(30, 45, 4, 8, 1.8, 2.5, bad));
            assertThrows(IllegalArgumentException.class, () -> new Bridge("b", bad, 13.8));
            assertThrows(IllegalArgumentException.class, () -> new Bridge("b", 210, bad));
        }
    }
}
