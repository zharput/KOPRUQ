using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class BridgeAlternativeTests
{
    [Fact]
    public void SpanCount_ReflectsNumberOfSpans()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 35, 35] };

        Assert.Equal(3, alt.SpanCount);
    }

    [Fact]
    public void TotalLengthM_IsSumOfSpans()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [35, 40, 35] };

        Assert.Equal(110, alt.TotalLengthM, precision: 6);
    }

    [Fact]
    public void IsUniformSpan_TrueWhenAllSpansEqual()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [40, 40, 40] };

        Assert.True(alt.IsUniformSpan);
    }

    [Fact]
    public void IsUniformSpan_FalseWhenSpansDiffer()
    {
        var alt = new BridgeAlternative { SpanLengthsM = [30, 40, 35] };

        Assert.False(alt.IsUniformSpan);
    }

    [Fact]
    public void EachAlternative_HasAUniqueId()
    {
        var a = new BridgeAlternative { SpanLengthsM = [40] };
        var b = new BridgeAlternative { SpanLengthsM = [40] };

        Assert.NotEqual(a.Id, b.Id);
    }
}
