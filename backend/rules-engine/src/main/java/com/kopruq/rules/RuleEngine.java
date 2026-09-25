package com.kopruq.rules;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.BridgeAlternative;
import com.kopruq.bridgecore.DesignSpace;

import java.util.List;

/**
 * Evaluates a set of {@link EngineeringRule}s against a bridge
 * alternative (spec section 11, P04). Ships with an empty rule set by
 * default - see {@link com.kopruq.rules package-info}: no rule content
 * exists yet, and none should be added without the engineer's explicit
 * approval.
 */
public final class RuleEngine {

    private final List<EngineeringRule> rules;

    public RuleEngine() {
        this(List.of());
    }

    public RuleEngine(List<EngineeringRule> rules) {
        this.rules = List.copyOf(rules);
    }

    public RuleEngineResult evaluate(BridgeAlternative alternative, Bridge bridge, DesignSpace designSpace) {
        var outcomes = rules.stream()
                .map(rule -> new RuleOutcome(
                        rule.id(),
                        rule.description(),
                        rule.evaluate(alternative, bridge, designSpace)))
                .toList();

        boolean feasible = outcomes.stream().allMatch(outcome -> outcome.evaluation().passed());

        return new RuleEngineResult(feasible, outcomes);
    }
}
