namespace Spanova.Core.Model;

/// <summary>An ordered sequence of spans along the bridge alignment.</summary>
public sealed class SpanLayout
{
    public IReadOnlyList<Span> Spans { get; init; } = Array.Empty<Span>();

    public int SpanCount => Spans.Count;

    /// <summary>Sum of all span lengths, in meters.</summary>
    public double TotalLengthM => Spans.Sum(s => s.LengthM);
}
