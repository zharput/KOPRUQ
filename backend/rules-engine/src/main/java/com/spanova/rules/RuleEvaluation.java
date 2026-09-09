package com.spanova.rules;

/** Result of evaluating one {@link EngineeringRule} against one alternative. */
public record RuleEvaluation(boolean passed, String reason) {

    public static RuleEvaluation pass() {
        return new RuleEvaluation(true, null);
    }

    public static RuleEvaluation fail(String reason) {
        return new RuleEvaluation(false, reason);
    }
}
