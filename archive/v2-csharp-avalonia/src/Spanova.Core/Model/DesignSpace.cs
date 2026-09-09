namespace Spanova.Core.Model;

/// <summary>
/// The ranges of design variables the engineer is willing to consider
/// (spec section 9, Generative Mode - spec section 6.B). All lengths are
/// in meters (SI).
///
/// Every range below is named explicitly in spec section 9. Note that
/// section 9 writes "Range" after each superstructure item (Girder Count
/// Range, Girder Spacing Range, Girder Depth Range, Slab Thickness
/// Range) but not after the substructure items (Pier Height, Pier
/// Diameter) - this is treated as a wording simplification rather than a
/// deliberate distinction, since a DesignSpace's entire purpose is to
/// hold ranges (spec section 6.B's own example gives "Pier Diameter =
/// 1.80-2.80 m" as a range). Flag this reading to the engineer if it's
/// wrong.
/// </summary>
public sealed class DesignSpace
{
    public double MinSpanM { get; set; }
    public double MaxSpanM { get; set; }

    public int MinGirderCount { get; set; }
    public int MaxGirderCount { get; set; }

    public double MinGirderSpacingM { get; set; }
    public double MaxGirderSpacingM { get; set; }

    public double MinGirderDepthM { get; set; }
    public double MaxGirderDepthM { get; set; }

    public double MinSlabThicknessM { get; set; }
    public double MaxSlabThicknessM { get; set; }

    public double MinPierDiameterM { get; set; }
    public double MaxPierDiameterM { get; set; }

    public double MinPierHeightM { get; set; }
    public double MaxPierHeightM { get; set; }

    /// <summary>
    /// Step used by Spanova.Generative when it enumerates girder depths
    /// within [MinGirderDepthM, MaxGirderDepthM]. Not named anywhere in
    /// the master spec - it is a combinatorial-search resolution, not an
    /// engineering quantity, so it does not need engineer approval the
    /// way a structural limit would. Documented here rather than
    /// hardcoded in Spanova.Generative so it stays auditable and
    /// user-adjustable.
    /// </summary>
    public double GirderDepthStepM { get; set; } = 0.10;
}
