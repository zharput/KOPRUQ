package com.kopruq.generative.model;

import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.rules.model.RuleEngineResult;

/** A generated {@link BridgeAlternative} together with the outcome of the rule engine for it. */
public record EvaluatedAlternative(BridgeAlternative alternative, RuleEngineResult ruleResult) {

    /** True when every rule passed (vacuously true while no rule is approved). */
    public boolean feasible() {
        return ruleResult.feasible();
    }
}
