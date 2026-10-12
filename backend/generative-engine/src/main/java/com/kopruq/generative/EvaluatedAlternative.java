package com.kopruq.generative;

import com.kopruq.bridgecore.BridgeAlternative;
import com.kopruq.rules.RuleEngineResult;

/** A generated {@link BridgeAlternative} together with the outcome of the rule engine for it. */
public record EvaluatedAlternative(BridgeAlternative alternative, RuleEngineResult ruleResult) {

    /** True when every rule passed (vacuously true while no rule is approved). */
    public boolean feasible() {
        return ruleResult.feasible();
    }
}
