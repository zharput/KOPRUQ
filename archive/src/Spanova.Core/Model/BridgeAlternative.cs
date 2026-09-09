namespace Spanova.Core.Model;

/// <summary>
/// One generated, concrete bridge configuration (a point in the design
/// space). Prototype P01 only produces uniform-span, precast-girder
/// viaduct alternatives - see docs/architecture.md, "Open Assumptions",
/// for why non-uniform span layouts are deferred.
/// </summary>
public sealed class BridgeAlternative
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Span lengths along the alignment, in meters, in order.</summary>
    public IReadOnlyList<double> SpanLengthsM { get; init; } = Array.Empty<double>();

    public int GirderCount { get; init; }

    /// <summary>Girder depth, in meters.</summary>
    public double GirderDepthM { get; init; }

    public int SpanCount => SpanLengthsM.Count;

    public double TotalLengthM => SpanLengthsM.Sum();

    /// <summary>True while every span in this alternative has the same length.</summary>
    public bool IsUniformSpan =>
        SpanLengthsM.Count == 0 ||
        SpanLengthsM.All(s => Math.Abs(s - SpanLengthsM[0]) < 1e-6);
}
