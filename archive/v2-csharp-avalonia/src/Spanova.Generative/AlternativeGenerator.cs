using Spanova.Core.Model;
using Spanova.Rules;

namespace Spanova.Generative;

/// <summary>
/// P03's "first computational design engine" (spec section 20).
///
/// Scope, per the spec's own P03 description: generate feasible
/// SPAN-LAYOUT and GIRDER alternatives only - not Deck/Pier/Foundation
/// (see BridgeAlternative.cs). "Feasible" here means only the
/// definitional/geometric consequences of the engineer's own ranges
/// (span count fits, spans sum to the requested length, girder
/// count/depth inside the requested range) - there is no Rules Engine
/// yet (that is P04) and no invented structural ratio or limit is
/// applied.
///
/// Open assumption: alternatives use a UNIFORM span layout (every span
/// in one alternative has the same length, TotalLengthM / SpanCount).
/// The spec's own example gives a single "Span Range = 30-45 m" per
/// alternative, not a per-span breakdown, so this is read as the
/// simplest faithful interpretation - flag it to the engineer if
/// non-uniform layouts (e.g. shorter end spans) are actually wanted here.
/// </summary>
public sealed class AlternativeGenerator
{
    public IReadOnlyList<BridgeAlternative> Generate(Bridge bridge, DesignSpace designSpace)
    {
        if (bridge.TotalLengthM <= 0)
        {
            throw new ArgumentException("TotalLengthM must be > 0.", nameof(bridge));
        }

        ValidateRange(designSpace.MinSpanM, designSpace.MaxSpanM, nameof(designSpace.MinSpanM));
        ValidateRange(designSpace.MinGirderCount, designSpace.MaxGirderCount, nameof(designSpace.MinGirderCount));
        ValidateRange(designSpace.MinGirderDepthM, designSpace.MaxGirderDepthM, nameof(designSpace.MinGirderDepthM));

        if (designSpace.GirderDepthStepM <= 0)
        {
            throw new ArgumentException("GirderDepthStepM must be > 0.", nameof(designSpace));
        }

        var results = new List<BridgeAlternative>();

        foreach (var spanCount in FeasibleSpanCounts(bridge.TotalLengthM, designSpace))
        {
            var uniformSpanLengthM = bridge.TotalLengthM / spanCount;
            var spanLayout = new SpanLayout
            {
                Spans = Enumerable.Repeat(new Span { LengthM = uniformSpanLengthM }, spanCount).ToArray(),
            };

            for (var girderCount = designSpace.MinGirderCount; girderCount <= designSpace.MaxGirderCount; girderCount++)
            {
                foreach (var girderDepthM in FeasibleGirderDepths(designSpace))
                {
                    results.Add(new BridgeAlternative
                    {
                        SpanLayout = spanLayout,
                        Girder = new Girder { Count = girderCount, DepthM = girderDepthM, SpacingM = 0 },
                    });
                }
            }
        }

        return results;
    }

    /// <summary>
    /// P04 (spec section 20): generate, then evaluate every candidate
    /// against <paramref name="ruleEngine"/> so the result is traceable
    /// accept/reject, not just a raw list. With today's empty
    /// <see cref="RuleEngine"/> (no rule has been approved yet - spec
    /// section 22) every candidate passes vacuously; the mechanism is
    /// real, its content is not.
    /// </summary>
    public IReadOnlyList<(BridgeAlternative Alternative, RuleEngineResult Result)> GenerateWithRules(
        Bridge bridge, DesignSpace designSpace, RuleEngine ruleEngine)
    {
        return Generate(bridge, designSpace)
            .Select(alt => (Alternative: alt, Result: ruleEngine.Evaluate(alt)))
            .ToList();
    }

    /// <summary>
    /// Span counts N for which a uniform span length TotalLengthM / N
    /// falls inside [MinSpanM, MaxSpanM]. A small tolerance avoids
    /// rejecting a valid layout on floating-point rounding alone.
    /// </summary>
    private static IEnumerable<int> FeasibleSpanCounts(double totalLengthM, DesignSpace designSpace)
    {
        const double tolerance = 1e-6;

        var minSpanCount = Math.Max(1, (int)Math.Floor(totalLengthM / designSpace.MaxSpanM));
        var maxSpanCount = Math.Max(1, (int)Math.Ceiling(totalLengthM / designSpace.MinSpanM));

        for (var n = minSpanCount; n <= maxSpanCount; n++)
        {
            var uniformSpan = totalLengthM / n;

            if (uniformSpan >= designSpace.MinSpanM - tolerance && uniformSpan <= designSpace.MaxSpanM + tolerance)
            {
                yield return n;
            }
        }
    }

    private static IEnumerable<double> FeasibleGirderDepths(DesignSpace designSpace)
    {
        for (var depth = designSpace.MinGirderDepthM; depth <= designSpace.MaxGirderDepthM + 1e-9; depth += designSpace.GirderDepthStepM)
        {
            yield return Math.Round(depth, 6);
        }
    }

    private static void ValidateRange(double min, double max, string paramName)
    {
        if (min <= 0 || max <= 0 || min > max)
        {
            throw new ArgumentException($"{paramName}/max range is invalid.", paramName);
        }
    }
}
