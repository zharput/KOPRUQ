package com.spanova.rules;

import com.spanova.bridgecore.Bridge;
import com.spanova.bridgecore.BridgeAlternative;
import com.spanova.bridgecore.DesignSpace;
import com.spanova.bridgecore.Girder;
import com.spanova.bridgecore.Span;
import com.spanova.bridgecore.SpanLayout;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests the P04 infrastructure itself, never real engineering content
 * (spec section 22) - the fake rules below exist only to prove the
 * engine's pass/fail/traceability plumbing.
 */
class RuleEngineTest {

    private static final Bridge BRIDGE = new Bridge("VIA-35", 210, 13.80);
    private static final DesignSpace DESIGN_SPACE =
            new DesignSpace(30, 45, 4, 8, 0, 0, 1.8, 2.5, 0, 0, 0, 0, 0, 0, 0.10);
    private static final BridgeAlternative ALTERNATIVE = BridgeAlternative.of(
            new SpanLayout(List.of(new Span(42), new Span(42), new Span(42), new Span(42), new Span(42))),
            new Girder(6, 2.0, 0));

    @Test
    void evaluate_withNoRules_isAlwaysFeasible() {
        var engine = new RuleEngine();

        var result = engine.evaluate(ALTERNATIVE, BRIDGE, DESIGN_SPACE);

        assertTrue(result.feasible());
        assertTrue(result.outcomes().isEmpty());
    }

    @Test
    void evaluate_withAllPassingRules_isFeasibleAndRecordsEveryOutcome() {
        var engine = new RuleEngine(List.of(new AlwaysPassTestRule("A"), new AlwaysPassTestRule("B")));

        var result = engine.evaluate(ALTERNATIVE, BRIDGE, DESIGN_SPACE);

        assertTrue(result.feasible());
        assertEquals(2, result.outcomes().size());
        assertEquals("A", result.outcomes().get(0).ruleId());
        assertTrue(result.outcomes().get(0).evaluation().passed());
    }

    @Test
    void evaluate_withOneFailingRule_isNotFeasibleAndReportsTheReason() {
        var engine = new RuleEngine(List.of(
                new AlwaysPassTestRule("A"),
                new AlwaysFailTestRule("B", "test failure reason")));

        var result = engine.evaluate(ALTERNATIVE, BRIDGE, DESIGN_SPACE);

        assertFalse(result.feasible());
        assertEquals(2, result.outcomes().size());
        var failedOutcome = result.outcomes().get(1);
        assertEquals("B", failedOutcome.ruleId());
        assertFalse(failedOutcome.evaluation().passed());
        assertEquals("test failure reason", failedOutcome.evaluation().reason());
    }

    /** Test-only fixture rule - never a real engineering rule. */
    private record AlwaysPassTestRule(String id) implements EngineeringRule {
        @Override
        public String description() {
            return "Test fixture rule that always passes.";
        }

        @Override
        public RuleEvaluation evaluate(BridgeAlternative alternative, Bridge bridge, DesignSpace designSpace) {
            return RuleEvaluation.pass();
        }
    }

    /** Test-only fixture rule - never a real engineering rule. */
    private record AlwaysFailTestRule(String id, String reason) implements EngineeringRule {
        @Override
        public String description() {
            return "Test fixture rule that always fails.";
        }

        @Override
        public RuleEvaluation evaluate(BridgeAlternative alternative, Bridge bridge, DesignSpace designSpace) {
            return RuleEvaluation.fail(reason);
        }
    }
}
