using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class SpanovaProjectTests
{
    [Fact]
    public void SelectedAlternative_NullWhenNoSelectionMade()
    {
        var project = new SpanovaProject();

        Assert.Null(project.SelectedAlternative);
    }

    [Fact]
    public void SelectedAlternative_ReturnsMatchingAlternativeById()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [40], GirderCount = 5, GirderDepthM = 2.0 };
        var project = new SpanovaProject
        {
            GeneratedAlternatives = [alt],
            SelectedAlternativeId = alt.Id,
        };

        Assert.Same(alt, project.SelectedAlternative);
    }

    [Fact]
    public void SelectedAlternative_NullWhenIdDoesNotMatchAnyGeneratedAlternative()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [40] };
        var project = new SpanovaProject
        {
            GeneratedAlternatives = [alt],
            SelectedAlternativeId = Guid.NewGuid(),
        };

        Assert.Null(project.SelectedAlternative);
    }
}
