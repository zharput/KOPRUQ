package com.spanova.rules;

import com.spanova.bridgecore.Bridge;
import com.spanova.bridgecore.BridgeAlternative;
import com.spanova.bridgecore.DesignSpace;

/**
 * A single, testable engineering feasibility check (spec section 11).
 * Rules must be explicit and traceable, never hidden inside UI code.
 *
 * <p>No implementation of this interface should exist in production
 * code without the engineer's explicit approval, source/reference,
 * units, assumptions and a validation-example test (spec section 22).
 */
public interface EngineeringRule {

    /** Stable identifier, e.g. "SPAN-DEPTH-RATIO". */
    String id();

    /** Human-readable description shown in reports and the UI. */
    String description();

    RuleEvaluation evaluate(BridgeAlternative alternative, Bridge bridge, DesignSpace designSpace);
}
