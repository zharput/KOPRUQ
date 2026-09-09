using Spanova.Core.Model;

namespace Spanova.Rules;

/// <summary>
/// One engineering feasibility check (spec section 11).
///
/// Spec section 11 requires every rule to eventually document: Rule ID,
/// Description, Category, Engineering source, Code/reference, Units,
/// Input parameters, Limit/value, Assumptions, Pass/fail logic,
/// Validation example, Automated test. <see cref="RuleId"/>,
/// <see cref="Description"/> and <see cref="Category"/> are runtime
/// properties because code needs to report and trace by them; Source,
/// Units, Input parameters, Limit/value and Assumptions belong in the
/// implementing class's XML doc comment (they are documentation, not
/// data the engine acts on), and the Validation example is the rule's
/// own xUnit test file - every rule implementation MUST follow this
/// convention (see CLAUDE.md).
///
/// No implementation of this interface exists yet - spec section 22:
/// "Do NOT invent engineering rules. I will provide engineering rules
/// and validate them." <see cref="RuleEngine"/> currently runs with
/// zero rules until the engineer supplies one.
/// </summary>
public interface IEngineeringRule
{
    /// <summary>Stable identifier, e.g. "SPAN-DEPTH-RATIO".</summary>
    string RuleId { get; }

    string Description { get; }

    /// <summary>Free-text grouping (e.g. "Superstructure", "Substructure") - spec section 11 names this but does not enumerate categories.</summary>
    string Category { get; }

    RuleEvaluation Evaluate(BridgeAlternative alternative);
}

/// <summary>Result of evaluating one rule against one alternative - always traceable back to the rule and a reason.</summary>
public readonly record struct RuleEvaluation(bool Passed, string? Reason = null)
{
    public static RuleEvaluation Pass() => new(true);
    public static RuleEvaluation Fail(string reason) => new(false, reason);
}
