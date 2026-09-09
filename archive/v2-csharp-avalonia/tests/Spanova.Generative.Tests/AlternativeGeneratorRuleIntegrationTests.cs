using Spanova.Core.Model;
using Spanova.Rules;

namespace Spanova.Generative.Tests;

/// <summary>
/// Proves GenerateWithRules (P04) wires AlternativeGenerator (P03) to
/// RuleEngine (P04) correctly. Uses the same test-double rule pattern as
/// Spanova.Rules.Tests - not real engineering content.
/// </summary>
public class AlternativeGeneratorRuleIntegrationTests
{
    private static Bridge SpecExampleBridge() => new() { BridgeName = "P04-example", TotalLengthM = 210 };

    private static DesignSpace SpecExampleDesignSpace() => new()
    {
        MinSpanM = 30,
        MaxSpanM = 45,
        MinGirderCount = 4,
        MaxGirderCount = 8,
        MinGirderDepthM = 1.8,
        MaxGirderDepthM = 2.5,
        GirderDepthStepM = 0.1,
    };

    private sealed class RejectEverythingRule : IEngineeringRule
    {
        public string RuleId => "TEST-REJECT-ALL";
        public string Description => "Test double: rejects every alternative.";
        public string Category => "Test";
        public RuleEvaluation Evaluate(BridgeAlternative alternative) => RuleEvaluation.Fail("test double always rejects");
    }

    [Fact]
    public void GenerateWithRules_WithNoRulesConfigured_EveryCandidateIsFeasible()
    {
        var results = new AlternativeGenerator().GenerateWithRules(SpecExampleBridge(), SpecExampleDesignSpace(), new RuleEngine());

        Assert.NotEmpty(results);
        Assert.All(results, r => Assert.True(r.Result.IsFeasible));
    }

    [Fact]
    public void GenerateWithRules_WithARejectingRule_EveryCandidateIsRejected_ButStillReturned()
    {
        var engine = new RuleEngine([new RejectEverythingRule()]);

        var results = new AlternativeGenerator().GenerateWithRules(SpecExampleBridge(), SpecExampleDesignSpace(), engine);

        Assert.NotEmpty(results);
        Assert.All(results, r => Assert.False(r.Result.IsFeasible));
        Assert.All(results, r => Assert.Contains("TEST-REJECT-ALL", r.Result.FailureReasons.Single()));
    }

    [Fact]
    public void GenerateWithRules_ResultCount_MatchesPlainGenerate()
    {
        var plain = new AlternativeGenerator().Generate(SpecExampleBridge(), SpecExampleDesignSpace());
        var withRules = new AlternativeGenerator().GenerateWithRules(SpecExampleBridge(), SpecExampleDesignSpace(), new RuleEngine());

        Assert.Equal(plain.Count, withRules.Count);
    }
}
