package com.kopruq.rules;

import java.util.List;

/**
 * Outcome of running every configured rule against one alternative
 * (spec section 20, P04 success criterion: "accepted/rejected with
 * traceable rule results").
 */
public record RuleEngineResult(boolean feasible, List<RuleOutcome> outcomes) {
}
