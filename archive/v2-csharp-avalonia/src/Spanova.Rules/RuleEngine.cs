using Spanova.Core.Model;

namespace Spanova.Rules;

/// <summary>Traceable outcome of running every configured rule against one alternative.</summary>
public sealed record RuleEngineResult(bool IsFeasible, IReadOnlyList<(IEngineeringRule Rule, RuleEvaluation Evaluation)> Evaluations)
{
    public IEnumerable<string> FailureReasons =>
        Evaluations.Where(e => !e.Evaluation.Passed).Select(e => $"[{e.Rule.RuleId}] {e.Evaluation.Reason}");
}

/// <summary>
/// Runs a configured set of <see cref="IEngineeringRule"/>s against a
/// bridge alternative (spec section 20, P04: "Generated alternatives can
/// be accepted/rejected with traceable rule results").
///
/// The rule set defaults to empty because no engineering rule has been
/// approved yet (spec section 22) - every alternative is therefore
/// "feasible" vacuously until the engineer supplies the first real rule.
/// This is P04's actual, intended state: the mechanism works and is
/// tested (see RuleEngineTests, which uses deliberately fake rules to
/// prove the plumbing), but it has no engineering content.
/// </summary>
public sealed class RuleEngine
{
    private readonly IReadOnlyList<IEngineeringRule> _rules;

    public RuleEngine(IReadOnlyList<IEngineeringRule>? rules = null)
    {
        _rules = rules ?? [];
    }

    public RuleEngineResult Evaluate(BridgeAlternative alternative)
    {
        var evaluations = _rules
            .Select(rule => (Rule: rule, Evaluation: rule.Evaluate(alternative)))
            .ToList();

        var isFeasible = evaluations.All(e => e.Evaluation.Passed);

        return new RuleEngineResult(isFeasible, evaluations);
    }
}
