using Spanova.Core.Model;

namespace Spanova.Rules.Tests;

/// <summary>
/// These tests exercise the RULE INFRASTRUCTURE only (spec section 20,
/// P04). The two rules below (<see cref="AlwaysPassRule"/>,
/// <see cref="AlwaysFailRule"/>) are test doubles, not real engineering
/// content - no engineering rule has been approved yet (spec section
/// 22). Do not mistake them for real rules.
/// </summary>
public class RuleEngineTests
{
    private static BridgeAlternative MakeAlternative() => new()
    {
        SpanLayout = new SpanLayout { Spans = [new Span { LengthM = 40 }] },
        Girder = new Girder { Count = 6, DepthM = 2.1, SpacingM = 2.3 },
    };

    private sealed class AlwaysPassRule : IEngineeringRule
    {
        public string RuleId => "TEST-PASS";
        public string Description => "Test double: always passes.";
        public string Category => "Test";
        public RuleEvaluation Evaluate(BridgeAlternative alternative) => RuleEvaluation.Pass();
    }

    private sealed class AlwaysFailRule : IEngineeringRule
    {
        public string RuleId => "TEST-FAIL";
        public string Description => "Test double: always fails.";
        public string Category => "Test";
        public RuleEvaluation Evaluate(BridgeAlternative alternative) => RuleEvaluation.Fail("deliberately failed for the test");
    }

    [Fact]
    public void Evaluate_WithNoRulesConfigured_IsFeasible()
    {
        // This is P04's actual, intended state today: zero approved rules.
        var engine = new RuleEngine();

        var result = engine.Evaluate(MakeAlternative());

        Assert.True(result.IsFeasible);
        Assert.Empty(result.Evaluations);
    }

    [Fact]
    public void Evaluate_WhenEveryRulePasses_IsFeasible()
    {
        var engine = new RuleEngine([new AlwaysPassRule()]);

        var result = engine.Evaluate(MakeAlternative());

        Assert.True(result.IsFeasible);
        Assert.Empty(result.FailureReasons);
    }

    [Fact]
    public void Evaluate_WhenAnyRuleFails_IsNotFeasible()
    {
        var engine = new RuleEngine([new AlwaysPassRule(), new AlwaysFailRule()]);

        var result = engine.Evaluate(MakeAlternative());

        Assert.False(result.IsFeasible);
    }

    [Fact]
    public void FailureReasons_AreTraceableToTheFailingRule()
    {
        var engine = new RuleEngine([new AlwaysFailRule()]);

        var result = engine.Evaluate(MakeAlternative());

        var reason = Assert.Single(result.FailureReasons);
        Assert.Contains("TEST-FAIL", reason);
        Assert.Contains("deliberately failed for the test", reason);
    }

    [Fact]
    public void Evaluate_RunsEveryConfiguredRule_EvenIfAnEarlierOneFails()
    {
        var engine = new RuleEngine([new AlwaysFailRule(), new AlwaysPassRule()]);

        var result = engine.Evaluate(MakeAlternative());

        Assert.Equal(2, result.Evaluations.Count);
    }
}
