using Spanova.Core.Model;

namespace Spanova.Rules;

/// <summary>
/// A single, testable engineering feasibility check (spec section 8).
/// Rules must be explicit and configurable, never hidden in UI code.
/// </summary>
public interface IEngineeringRule
{
    /// <summary>Stable identifier, e.g. "SPAN-RANGE".</summary>
    string Id { get; }

    /// <summary>Human-readable description shown in reports and the UI.</summary>
    string Description { get; }

    RuleEvaluation Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace);
}

/// <summary>Result of evaluating one rule against one alternative.</summary>
public readonly record struct RuleEvaluation(bool Passed, string? Reason = null)
{
    public static RuleEvaluation Pass() => new(true);
    public static RuleEvaluation Fail(string reason) => new(false, reason);
}
