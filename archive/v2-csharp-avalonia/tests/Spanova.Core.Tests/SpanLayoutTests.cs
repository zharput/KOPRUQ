using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class SpanLayoutTests
{
    [Fact]
    public void SpanCount_ReflectsNumberOfSpans()
    {
        var layout = new SpanLayout
        {
            Spans = [new Span { LengthM = 35 }, new Span { LengthM = 35 }, new Span { LengthM = 35 }],
        };

        Assert.Equal(3, layout.SpanCount);
    }

    [Fact]
    public void TotalLengthM_IsSumOfSpanLengths()
    {
        var layout = new SpanLayout
        {
            Spans = [new Span { LengthM = 35 }, new Span { LengthM = 40 }, new Span { LengthM = 35 }],
        };

        Assert.Equal(110, layout.TotalLengthM, precision: 6);
    }

    [Fact]
    public void EmptyLayout_HasZeroCountAndLength()
    {
        var layout = new SpanLayout();

        Assert.Equal(0, layout.SpanCount);
        Assert.Equal(0, layout.TotalLengthM, precision: 6);
    }
}
