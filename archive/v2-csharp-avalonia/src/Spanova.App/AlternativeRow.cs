using Spanova.Core.Model;
using Spanova.Rules;

namespace Spanova.App;

/// <summary>Flat, bindable view of a <see cref="BridgeAlternative"/> + its <see cref="RuleEngineResult"/> for the results table.</summary>
public sealed class AlternativeRow
{
    public AlternativeRow(BridgeAlternative alternative, RuleEngineResult ruleResult)
    {
        SpanCount = alternative.SpanLayout.SpanCount;
        SpanLengthM = Math.Round(alternative.SpanLayout.Spans.Count > 0 ? alternative.SpanLayout.Spans[0].LengthM : 0, 3);
        TotalLengthM = Math.Round(alternative.SpanLayout.TotalLengthM, 3);
        GirderCount = alternative.Girder.Count;
        GirderDepthM = alternative.Girder.DepthM;

        Status = ruleResult.IsFeasible
            ? (ruleResult.Evaluations.Count == 0 ? "Pass (no rules yet)" : "Pass")
            : "Reject";
        FailureReasons = string.Join("; ", ruleResult.FailureReasons);
    }

    public int SpanCount { get; }
    public double SpanLengthM { get; }
    public double TotalLengthM { get; }
    public int GirderCount { get; }
    public double GirderDepthM { get; }
    public string Status { get; }
    public string FailureReasons { get; }
}
