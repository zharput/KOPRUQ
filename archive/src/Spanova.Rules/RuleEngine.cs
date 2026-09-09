using Spanova.Core.Model;

namespace Spanova.Rules;

/// <summary>Outcome of running every configured rule against one alternative.</summary>
public sealed record RuleEngineResult(bool IsFeasible, IReadOnlyList<(IEngineeringRule Rule, RuleEvaluation Evaluation)> Evaluations)
{
    public IEnumerable<string> FailureReasons =>
        Evaluations.Where(e => !e.Evaluation.Passed).Select(e => $"[{e.Rule.Id}] {e.Evaluation.Reason}");
}

/// <summary>
/// Evaluates a set of <see cref="IEngineeringRule"/> against a bridge
/// alternative. Used by Spanova.Generative to filter the generated design
/// space down to feasible alternatives (spec section 7).
/// </summary>
public sealed class RuleEngine
{
    private readonly IReadOnlyList<IEngineeringRule> _rules;

    public RuleEngine(IReadOnlyList<IEngineeringRule>? rules = null)
    {
        _rules = rules ?? StandardRules.Default;
    }

    public RuleEngineResult Evaluate(BridgeAlternative alternative, BridgeDefinition bridge, DesignSpace designSpace)
    {
        var evaluations = _rules
            .Select(rule => (Rule: rule, Evaluation: rule.Evaluate(alternative, bridge, designSpace)))
            .ToList();

        var isFeasible = evaluations.All(e => e.Evaluation.Passed);

        return new RuleEngineResult(isFeasible, evaluations);
    }
}
