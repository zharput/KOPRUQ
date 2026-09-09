using Spanova.Core.Model;

namespace Spanova.Rules;

/// <summary>
/// Rules shipped with Prototype P01.
///
/// IMPORTANT (see docs/architecture.md, "Open Assumptions"): the SPANOVA
/// master specification gives EXAMPLE rule patterns (e.g. "IF GirderDepth /
/// Span outside permitted range THEN Reject") but no concrete numeric
/// engineering ratios or standard references. Per the AI policy
/// ("Do not invent engineering equations"), P01 therefore ONLY implements
/// rules that are purely definitional/geometric consequences of the
/// engineer's own inputs - it does NOT check span/depth ratios, girder
/// spacing limits, or any other structural proportioning rule. Those must
/// be added later with an explicit source/code reference, units,
/// assumptions and validation example, as required by spec section 15.
/// </summary>
public static class StandardRules
{
    public static IReadOnlyList<IEngineeringRule> Default { get; } =
    [
        new SpanWithinDesignSpaceRule(),
        new SpanSumMatchesTotalLengthRule(),
        new GirderCountWithinDesignSpaceRule(),
        new GirderDepthWithinDesignSpaceRule(),
    ];
}

/// <summary>Every span length must lie within [MinSpanM, MaxSpanM].</summary>
public sealed class SpanWithinDesignSpaceRule : IEngineeringRule
{
    public string Id => "SPAN-RANGE";
    public string Description => "Each span length must be within the engineer-defined span range.";

    public RuleEvaluation Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace)
    {
        foreach (var span in alternative.SpanLengthsM)
        {
            if (span < designSpace.MinSpanM - 1e-6 || span > designSpace.MaxSpanM + 1e-6)
            {
                return RuleEvaluation.Fail(
                    $"Span {span:F2} m is outside the allowed range [{designSpace.MinSpanM:F2}, {designSpace.MaxSpanM:F2}] m.");
            }
        }

        return RuleEvaluation.Pass();
    }
}

/// <summary>The sum of the alternative's spans must reconstruct the total bridge length.</summary>
public sealed class SpanSumMatchesTotalLengthRule : IEngineeringRule
{
    private const double ToleranceM = 0.01; // 1 cm - floating point / rounding tolerance only

    public string Id => "SPAN-SUM-LENGTH";
    public string Description => "The sum of span lengths must equal the total bridge length.";

    public RuleEvaluation Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace)
    {
        var diff = Math.Abs(alternative.TotalLengthM - bridge.TotalLengthM);

        return diff <= ToleranceM
            ? RuleEvaluation.Pass()
            : RuleEvaluation.Fail(
                $"Sum of spans {alternative.TotalLengthM:F2} m does not match total bridge length {bridge.TotalLengthM:F2} m.");
    }
}

/// <summary>Girder count must lie within [MinGirderCount, MaxGirderCount].</summary>
public sealed class GirderCountWithinDesignSpaceRule : IEngineeringRule
{
    public string Id => "GIRDER-COUNT-RANGE";
    public string Description => "Girder count must be within the engineer-defined range.";

    public RuleEvaluation Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace)
    {
        if (alternative.GirderCount < designSpace.MinGirderCount || alternative.GirderCount > designSpace.MaxGirderCount)
        {
            return RuleEvaluation.Fail(
                $"Girder count {alternative.GirderCount} is outside the allowed range [{designSpace.MinGirderCount}, {designSpace.MaxGirderCount}].");
        }

        return RuleEvaluation.Pass();
    }
}

/// <summary>Girder depth must lie within [MinGirderDepthM, MaxGirderDepthM].</summary>
public sealed class GirderDepthWithinDesignSpaceRule : IEngineeringRule
{
    public string Id => "GIRDER-DEPTH-RANGE";
    public string Description => "Girder depth must be within the engineer-defined range.";

    public RuleEvaluation Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace)
    {
        if (alternative.GirderDepthM < designSpace.MinGirderDepthM - 1e-6 ||
            alternative.GirderDepthM > designSpace.MaxGirderDepthM + 1e-6)
        {
            return RuleEvaluation.Fail(
                $"Girder depth {alternative.GirderDepthM:F2} m is outside the allowed range [{designSpace.MinGirderDepthM:F2}, {designSpace.MaxGirderDepthM:F2}] m.");
        }

        return RuleEvaluation.Pass();
    }
}
