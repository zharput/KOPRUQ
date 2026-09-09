using Spanova.Core.Model;

namespace Spanova.Core.Tests;

public class DesignSpaceTests
{
    private static DesignSpace ValidSpace() => new()
    {
        MinSpanM = 30,
        MaxSpanM = 45,
        MinGirderCount = 4,
        MaxGirderCount = 8,
        MinGirderDepthM = 1.8,
        MaxGirderDepthM = 2.5,
    };

    [Fact]
    public void IsValid_TrueForWellFormedRanges()
    {
        Assert.True(ValidSpace().IsValid(out var error));
        Assert.Null(error);
    }

    [Fact]
    public void IsValid_FalseWhenMinSpanExceedsMaxSpan()
    {
        var space = ValidSpace();
        space.MinSpanM = 50;
        space.MaxSpanM = 40;

        Assert.False(space.IsValid(out var error));
        Assert.NotNull(error);
    }

    [Fact]
    public void IsValid_FalseWhenGirderCountRangeInverted()
    {
        var space = ValidSpace();
        space.MinGirderCount = 10;
        space.MaxGirderCount = 4;

        Assert.False(space.IsValid(out _));
    }

    [Fact]
    public void IsValid_FalseWhenGirderDepthStepIsZero()
    {
        var space = ValidSpace();
        space.GirderDepthStepM = 0;

        Assert.False(space.IsValid(out _));
    }

    [Fact]
    public void GirderDepthStepM_DefaultsToTenCentimeters()
    {
        Assert.Equal(0.10, new DesignSpace().GirderDepthStepM, precision: 6);
    }
}
