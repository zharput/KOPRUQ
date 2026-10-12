package com.kopruq.rules.domain;

import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.rules.model.RuleEvaluation;

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
