using Spanova.Core.Model;

namespace Spanova.Generative.Tests;

public class AlternativeGeneratorTests
{
    // Spec section 20's own P03 worked example.
    private static Bridge SpecExampleBridge() => new()
    {
        BridgeName = "P03-example",
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
    public void Generate_SpecExample_ProducesOnlyAlternativesWithinTheRequestedRanges()
    {
        var alternatives = new AlternativeGenerator().Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        Assert.NotEmpty(alternatives);

        foreach (var alt in alternatives)
        {
            Assert.InRange(alt.SpanLayout.Spans[0].LengthM, 30 - 1e-6, 45 + 1e-6);
            Assert.InRange(alt.Girder.Count, 4, 8);
            Assert.InRange(alt.Girder.DepthM, 1.8 - 1e-6, 2.5 + 1e-6);
            Assert.Equal(210, alt.SpanLayout.TotalLengthM, precision: 3);

            // Deck/Pier/Foundation are explicitly out of P03's scope.
            Assert.Null(alt.Deck);
            Assert.Null(alt.Pier);
            Assert.Null(alt.Foundation);
        }
    }

    [Fact]
    public void Generate_SpecExample_FindsExpectedSpanCounts()
    {
        // 210 / N must fall within [30, 45]:
        //   N=5 -> 42 m, N=6 -> 35 m, N=7 -> 30 m are the only integers that fit.
        var alternatives = new AlternativeGenerator().Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        var spanCountsFound = alternatives.Select(a => a.SpanLayout.SpanCount).Distinct().OrderBy(n => n).ToArray();

        Assert.Equal([5, 6, 7], spanCountsFound);
    }

    [Fact]
    public void Generate_SpecExample_ProducesExpectedCombinationCount()
    {
        // 3 span counts (5,6,7) x 5 girder counts (4..8) x 8 girder depths (1.8..2.5 step 0.1)
        var alternatives = new AlternativeGenerator().Generate(SpecExampleBridge(), SpecExampleDesignSpace());

        Assert.Equal(3 * 5 * 8, alternatives.Count);
    }

    [Fact]
    public void Generate_ReturnsEmpty_WhenNoSpanCountFitsTheRange()
    {
        var bridge = new Bridge { BridgeName = "Impossible", TotalLengthM = 100 };
        var designSpace = new DesignSpace
        {
            MinSpanM = 40,
            MaxSpanM = 41,
            MinGirderCount = 4,
            MaxGirderCount = 4,
            MinGirderDepthM = 2.0,
            MaxGirderDepthM = 2.0,
        };

        var alternatives = new AlternativeGenerator().Generate(bridge, designSpace);

        Assert.Empty(alternatives);
    }

    [Fact]
    public void Generate_Throws_WhenSpanRangeIsInvalid()
    {
        var bridge = SpecExampleBridge();
        var invalidSpace = SpecExampleDesignSpace();
        invalidSpace.MinSpanM = 50;
        invalidSpace.MaxSpanM = 10;

        Assert.Throws<ArgumentException>(() => new AlternativeGenerator().Generate(bridge, invalidSpace));
    }

    [Fact]
    public void Generate_Throws_WhenTotalLengthIsNotPositive()
    {
        var bridge = new Bridge { BridgeName = "Zero", TotalLengthM = 0 };

        Assert.Throws<ArgumentException>(() => new AlternativeGenerator().Generate(bridge, SpecExampleDesignSpace()));
    }
}
