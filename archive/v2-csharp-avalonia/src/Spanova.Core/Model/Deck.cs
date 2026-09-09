namespace Spanova.Core.Model;

/// <summary>Superstructure deck sizing for one bridge alternative (spec section 9).</summary>
public sealed class Deck
{
    /// <summary>Deck slab thickness, in meters.</summary>
    public double SlabThicknessM { get; init; }
}
