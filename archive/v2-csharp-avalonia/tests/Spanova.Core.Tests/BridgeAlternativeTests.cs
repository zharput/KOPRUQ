using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class BridgeAlternativeTests
{
    private static BridgeAlternative MakeAlternative() => new()
    {
        SpanLayout = new SpanLayout { Spans = [new Span { LengthM = 40 }, new Span { LengthM = 40 }] },
        Deck = new Deck { SlabThicknessM = 0.25 },
        Girder = new Girder { Count = 6, DepthM = 2.1, SpacingM = 2.3 },
        Pier = new Pier { DiameterM = 2.2, HeightM = 12, PierType = "" },
        Foundation = new Foundation { Type = FoundationType.Pile, PileCount = 8, PileDiameterM = 1.2 },
    };

    [Fact]
    public void EachAlternative_HasAUniqueId()
    {
        var a = MakeAlternative();
        var b = MakeAlternative();

        Assert.NotEqual(a.Id, b.Id);
    }

    [Fact]
    public void CanBeFullyConstructed_WithoutAnyAllplanOrExternalType()
    {
        // This is P01's stated success criterion (spec section 20):
        // "A bridge can be represented independently of ALLPLAN."
        var alt = MakeAlternative();

        Assert.Equal(2, alt.SpanLayout.SpanCount);
        Assert.Equal(80, alt.SpanLayout.TotalLengthM, precision: 6);
        Assert.Equal(6, alt.Girder.Count);
        Assert.NotNull(alt.Foundation);
        Assert.Equal(FoundationType.Pile, alt.Foundation.Type);
    }
}
