namespace Spanova.Core.Model;

/// <summary>
/// The ranges of design variables the engineer is willing to consider
/// (the "DESIGN SPACE" tab in Prototype P01). Generative Mode explores
/// this space; Computational Mode collapses each range to a single value.
/// All lengths are in meters (SI).
/// </summary>
public sealed class DesignSpace
{
    public double MinSpanM { get; set; }
    public double MaxSpanM { get; set; }

    public int MinGirderCount { get; set; }
    public int MaxGirderCount { get; set; }

    public double MinGirderDepthM { get; set; }
    public double MaxGirderDepthM { get; set; }

    /// <summary>
    /// Discretization step used by the generative engine when it enumerates
    /// girder depths within [MinGirderDepthM, MaxGirderDepthM].
    /// NOT specified in the SPANOVA master specification - this is a
    /// documented, auditable default (see docs/architecture.md,
    /// "Open Assumptions") rather than an invented engineering rule. It
    /// controls combinatorial density only, not structural feasibility.
    /// </summary>
    public double GirderDepthStepM { get; set; } = 0.10;

    public bool IsValid(out string? error)
    {
        if (MinSpanM <= 0 || MaxSpanM <= 0 || MinSpanM > MaxSpanM)
        {
            error = "Span range is invalid (MinSpanM must be > 0 and <= MaxSpanM).";
            return false;
        }

        if (MinGirderCount <= 0 || MaxGirderCount <= 0 || MinGirderCount > MaxGirderCount)
        {
            error = "Girder count range is invalid.";
            return false;
        }

        if (MinGirderDepthM <= 0 || MaxGirderDepthM <= 0 || MinGirderDepthM > MaxGirderDepthM)
        {
            error = "Girder depth range is invalid.";
            return false;
        }

        if (GirderDepthStepM <= 0)
        {
            error = "GirderDepthStepM must be > 0.";
            return false;
        }

        error = null;
        return true;
    }
}
