using Spanova.Core.Model;
using Spanova.Rules;

namespace Spanova.Generative;

/// <summary>
/// Prototype P01's generative engine for the "PRECAST GIRDER VIADUCT"
/// bridge type (spec section 12).
///
/// Open assumption (see docs/architecture.md, "Open Assumptions"): P01
/// only generates UNIFORM-span layouts, i.e. every span in a given
/// alternative has the same length TotalLengthM / SpanCount. The master
/// specification's example ("Span = 35-45 m") describes a single span
/// value per alternative, not a per-span breakdown, so this is read as
/// the simplest faithful interpretation. Non-uniform span layouts
/// (asymmetric end spans, etc.) are deferred to a later phase.
/// </summary>
public sealed class AlternativeGenerator
{
    private readonly RuleEngine _ruleEngine;

    public AlternativeGenerator(RuleEngine? ruleEngine = null)
    {
        _ruleEngine = ruleEngine ?? new RuleEngine();
    }

    /// <summary>
    /// Enumerates the combinatorial design space and returns only the
    /// alternatives that pass every configured engineering rule.
    /// </summary>
    public GenerationResult Generate(BridgeDefinition bridge, DesignSpace designSpace)
    {
        if (!designSpace.IsValid(out var designSpaceError))
        {
            throw new ArgumentException(designSpaceError, nameof(designSpace));
        }

        if (bridge.TotalLengthM <= 0)
        {
            throw new ArgumentException("TotalLengthM must be > 0.", nameof(bridge));
        }

        var candidates = new List<BridgeAlternative>();
        var feasible = new List<BridgeAlternative>();
        var rejected = new List<(BridgeAlternative Alternative, RuleEngineResult Result)>();

        foreach (var spanCount in EnumerateSpanCounts(bridge.TotalLengthM, designSpace))
        {
            var uniformSpanLengthM = bridge.TotalLengthM / spanCount;
            var spanLengths = Enumerable.Repeat(uniformSpanLengthM, spanCount).ToArray();

            foreach (var girderCount in EnumerateGirderCounts(designSpace))
            {
                foreach (var girderDepthM in EnumerateGirderDepths(designSpace))
                {
                    var alternative = new BridgeAlternative
                    {
                        SpanLengthsM = spanLengths,
                        GirderCount = girderCount,
                        GirderDepthM = girderDepthM,
                    };

                    candidates.Add(alternative);

                    var result = _ruleEngine.Evaluate(alternative, bridge, designSpace);

                    if (result.IsFeasible)
                    {
                        feasible.Add(alternative);
                    }
                    else
                    {
                        rejected.Add((alternative, result));
                    }
                }
            }
        }

        return new GenerationResult(candidates, feasible, rejected);
    }

    /// <summary>
    /// Span counts N for which a uniform span length TotalLengthM / N
    /// falls inside [MinSpanM, MaxSpanM]. A small tolerance is used to
    /// avoid rejecting valid layouts on floating point rounding alone.
    /// </summary>
    private static IEnumerable<int> EnumerateSpanCounts(double totalLengthM, DesignSpace designSpace)
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

    private static IEnumerable<int> EnumerateGirderCounts(DesignSpace designSpace)
    {
        for (var g = designSpace.MinGirderCount; g <= designSpace.MaxGirderCount; g++)
        {
            yield return g;
        }
    }

    private static IEnumerable<double> EnumerateGirderDepths(DesignSpace designSpace)
    {
        var step = designSpace.GirderDepthStepM;

        for (var depth = designSpace.MinGirderDepthM; depth <= designSpace.MaxGirderDepthM + 1e-9; depth += step)
        {
            yield return Math.Round(depth, 6);
        }
    }
}

/// <summary>
/// Result of one GENERATE run: every combinatorial candidate considered,
/// the subset that passed all engineering rules, and the rejected ones
/// with their reasons (spec section 7's "1,248 generated -> ... -> 11
/// Pareto-optimal" funnel - P01 stops at the "feasible" stage).
/// </summary>
public sealed record GenerationResult(
    IReadOnlyList<BridgeAlternative> AllCandidates,
    IReadOnlyList<BridgeAlternative> FeasibleAlternatives,
    IReadOnlyList<(BridgeAlternative Alternative, RuleEngineResult Result)> RejectedAlternatives);
