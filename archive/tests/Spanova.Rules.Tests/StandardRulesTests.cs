using Spanova.Core.Model;
using Spanova.Rules;

namespace Spanova.Rules.Tests;

public class StandardRulesTests
{
    private static DesignSpace Space() => new()
    {
        MinSpanM = 30,
        MaxSpanM = 45,
        MinGirderCount = 4,
        MaxGirderCount = 8,
        MinGirderDepthM = 1.8,
        MaxGirderDepthM = 2.5,
    };

    private static BridgeDefinition Bridge(double totalLengthM = 210) => new()
    {
        BridgeName = "Test Bridge",
        TotalLengthM = totalLengthM,
        DeckWidthM = 13.8,
    };

    // --- SpanWithinDesignSpaceRule ---

    [Fact]
    public void SpanWithinDesignSpaceRule_Passes_WhenAllSpansInRange()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35] };

        var result = new SpanWithinDesignSpaceRule().Evaluate(alt, Bridge(105), Space());

        Assert.True(result.Passed);
    }

    [Theory]
    [InlineData(29.0)]  // below MinSpanM
    [InlineData(46.0)]  // above MaxSpanM
    public void SpanWithinDesignSpaceRule_Fails_WhenSpanOutOfRange(double span)
    {
        var alt = new BridgeAlternative { SpanLengthsM = [span] };

        var result = new SpanWithinDesignSpaceRule().Evaluate(alt, Bridge(span), Space());

        Assert.False(result.Passed);
        Assert.NotNull(result.Reason);
    }

    // --- SpanSumMatchesTotalLengthRule ---

    [Fact]
    public void SpanSumMatchesTotalLengthRule_Passes_WhenSumEqualsTotalLength()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35] };

        var result = new SpanSumMatchesTotalLengthRule().Evaluate(alt, Bridge(105), Space());

        Assert.True(result.Passed);
    }

    [Fact]
    public void SpanSumMatchesTotalLengthRule_Fails_WhenSumDiffersFromTotalLength()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35] };

        var result = new SpanSumMatchesTotalLengthRule().Evaluate(alt, Bridge(210), Space());

        Assert.False(result.Passed);
    }

    // --- GirderCountWithinDesignSpaceRule ---

    [Theory]
    [InlineData(4, true)]
    [InlineData(8, true)]
    [InlineData(3, false)]
    [InlineData(9, false)]
    public void GirderCountWithinDesignSpaceRule_ChecksRangeInclusive(int girderCount, bool expectedPass)
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35], GirderCount = girderCount };

        var result = new GirderCountWithinDesignSpaceRule().Evaluate(alt, Bridge(35), Space());

        Assert.Equal(expectedPass, result.Passed);
    }

    // --- GirderDepthWithinDesignSpaceRule ---

    [Theory]
    [InlineData(1.8, true)]
    [InlineData(2.5, true)]
    [InlineData(1.79, false)]
    [InlineData(2.51, false)]
    public void GirderDepthWithinDesignSpaceRule_ChecksRangeInclusive(double depth, bool expectedPass)
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35], GirderDepthM = depth };

        var result = new GirderDepthWithinDesignSpaceRule().Evaluate(alt, Bridge(35), Space());

        Assert.Equal(expectedPass, result.Passed);
    }

    // --- RuleEngine ---

    [Fact]
    public void RuleEngine_IsFeasible_WhenEveryRulePasses()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35], GirderCount = 6, GirderDepthM = 2.1 };

        var result = new RuleEngine().Evaluate(alt, Bridge(105), Space());

        Assert.True(result.IsFeasible);
        Assert.Empty(result.FailureReasons);
    }

    [Fact]
    public void RuleEngine_NotFeasible_WhenAnyRuleFails()
    {
        // Girder count 20 violates GIRDER-COUNT-RANGE only.
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35], GirderCount = 20, GirderDepthM = 2.1 };

        var result = new RuleEngine().Evaluate(alt, Bridge(105), Space());

        Assert.False(result.IsFeasible);
        Assert.Contains(result.FailureReasons, r => r.Contains("GIRDER-COUNT-RANGE"));
    }
}
