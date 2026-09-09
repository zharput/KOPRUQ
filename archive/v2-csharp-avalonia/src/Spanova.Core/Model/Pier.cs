namespace Spanova.Core.Model;

/// <summary>
/// Substructure pier sizing for one bridge alternative (spec section 9).
///
/// <see cref="PierType"/> is a free-text label rather than an enum: the
/// master specification names "Pier Type" as a design-space parameter
/// but does not enumerate specific categories anywhere (e.g. circular /
/// wall / hammerhead) - inventing that taxonomy would violate spec
/// section 22 ("never invent ... structural assumptions"). Replace this
/// with a real enum once the engineer specifies the allowed pier types.
/// </summary>
public sealed class Pier
{
    /// <summary>Pier diameter, in meters.</summary>
    public double DiameterM { get; init; }

    /// <summary>Pier height, in meters.</summary>
    public double HeightM { get; init; }

    public string PierType { get; init; } = string.Empty;
}
