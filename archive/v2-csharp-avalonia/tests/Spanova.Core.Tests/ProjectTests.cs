using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class ProjectTests
{
    private static BridgeAlternative MakeAlternative() => new()
    {
        SpanLayout = new SpanLayout { Spans = [new Span { LengthM = 40 }] },
        Deck = new Deck { SlabThicknessM = 0.25 },
        Girder = new Girder { Count = 6, DepthM = 2.1, SpacingM = 2.3 },
        Pier = new Pier { DiameterM = 2.2, HeightM = 12 },
        Foundation = new Foundation { Type = FoundationType.Pile, PileCount = 8, PileDiameterM = 1.2 },
    };

    [Fact]
    public void SelectedAlternative_NullWhenNoSelectionMade()
    {
        var project = new Project();

        Assert.Null(project.SelectedAlternative);
    }

    [Fact]
    public void SelectedAlternative_ReturnsMatchingAlternativeById()
    {
        var alt = MakeAlternative();
        var project = new Project
        {
            GeneratedAlternatives = [alt],
            SelectedAlternativeId = alt.Id,
        };

        Assert.Same(alt, project.SelectedAlternative);
    }

    [Fact]
    public void SelectedAlternative_NullWhenIdDoesNotMatchAnyGeneratedAlternative()
    {
        var alt = MakeAlternative();
        var project = new Project
        {
            GeneratedAlternatives = [alt],
            SelectedAlternativeId = Guid.NewGuid(),
        };

        Assert.Null(project.SelectedAlternative);
    }
}
