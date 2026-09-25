package com.kopruq.rules;

/** One rule's identity paired with its evaluation - the unit of traceability P04 requires. */
public record RuleOutcome(String ruleId, String ruleDescription, RuleEvaluation evaluation) {
}
