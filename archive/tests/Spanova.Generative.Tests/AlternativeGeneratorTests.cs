using Spanova.Core.Model;

namespace Spanova.Generative.Tests;

public class AlternativeGeneratorTests
{
    // Matches the spec's own worked example (section 18):
    // Length=210 m, Deck=13.80 m, Span=30-45 m, GirderCount=4-8, GirderDepth=1.80-2.50 m.
    private static BridgeDefinition SpecExampleBridge() => new()
    {
        BridgeName = "VIA35",
        TotalLengthM = 210,
        DeckWidthM = 13.80,
    };

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

    [Fact]
    public void Generate_SpecExample_ProducesOnlyUniformSpanFeasibleAlternatives()
    {
        var generator = new AlternativeGenerator();

        var result = generator.Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        Assert.NotEmpty(result.FeasibleAlternatives);

        foreach (var alt in result.FeasibleAlternatives)
        {
            Assert.True(alt.IsUniformSpan);
            Assert.InRange(alt.SpanLengthsM[0], 30 - 1e-6, 45 + 1e-6);
            Assert.InRange(alt.GirderCount, 4, 8);
            Assert.InRange(alt.GirderDepthM, 1.8 - 1e-6, 2.5 + 1e-6);
            Assert.Equal(210, alt.TotalLengthM, precision: 3);
        }
    }

    [Fact]
    public void Generate_SpecExample_FindsExpectedSpanCounts()
    {
        // 210 / N must fall within [30, 45]:
        //   N=5 -> 42 m, N=6 -> 35 m, N=7 -> 30 m are the only integers that fit.
        var generator = new AlternativeGenerator();

        var result = generator.Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        var spanCountsFound = result.FeasibleAlternatives.Select(a => a.SpanCount).Distinct().OrderBy(n => n).ToArray();

        Assert.Equal([5, 6, 7], spanCountsFound);
    }

    [Fact]
    public void Generate_SpecExample_EveryCandidateIsFeasible_BecauseTheyAreConstructedWithinRange()
    {
        // Span counts, girder counts and girder depths are enumerated FROM the
        // design space, so - unlike a real geometric layout search - every
        // combinatorial candidate here should already satisfy the P01 rules.
        var generator = new AlternativeGenerator();

        var result = generator.Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        Assert.Equal(result.AllCandidates.Count, result.FeasibleAlternatives.Count);
        Assert.Empty(result.RejectedAlternatives);

        // 3 span counts (5,6,7) x 5 girder counts (4..8) x 8 girder depths (1.8..2.5 step 0.1)
        Assert.Equal(3 * 5 * 8, result.AllCandidates.Count);
    }

    [Fact]
    public void Generate_ReturnsNoCandidates_WhenNoSpanCountFitsTheRange()
    {
        var bridge = new BridgeDefinition { BridgeName = "Impossible", TotalLengthM = 100 };
        var designSpace = new DesignSpace
        {
            MinSpanM = 40,
            MaxSpanM = 41,
            MinGirderCount = 4,
            MaxGirderCount = 4,
            MinGirderDepthM = 2.0,
            MaxGirderDepthM = 2.0,
        };

        var result = new AlternativeGenerator().Generate(bridge, designSpace);

        Assert.Empty(result.AllCandidates);
        Assert.Empty(result.FeasibleAlternatives);
    }

    [Fact]
    public void Generate_Throws_WhenDesignSpaceIsInvalid()
    {
        var bridge = SpecExampleBridge();
        var invalidSpace = new DesignSpace { MinSpanM = 50, MaxSpanM = 10 };

        Assert.Throws<ArgumentException>(() => new AlternativeGenerator().Generate(bridge, invalidSpace));
    }

    [Fact]
    public void Generate_Throws_WhenTotalLengthIsNotPositive()
    {
        var bridge = new BridgeDefinition { BridgeName = "Zero", TotalLengthM = 0 };

        Assert.Throws<ArgumentException>(() => new AlternativeGenerator().Generate(bridge, SpecExampleDesignSpace()));
    }
}
