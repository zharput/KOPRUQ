namespace Spanova.Core.Model;

/// <summary>Spec section 7: the two long-term foundation subtypes.</summary>
public enum FoundationType
{
    Spread,
    Pile,
}

/// <summary>
/// Substructure foundation sizing for one bridge alternative (spec
/// section 9).
///
/// Only pile-foundation dimensions are modelled (<see cref="PileCount"/>,
/// <see cref="PileDiameterM"/>) because those are the only foundation
/// dimensions the master specification names. Spread-footing sizing
/// (width/length/depth) is not modelled yet - the spec does not specify
/// which parameters describe one, and inventing them would violate spec
/// section 22. Ask the engineer before adding spread-footing fields.
/// </summary>
public sealed class Foundation
{
    public FoundationType Type { get; init; }

    /// <summary>Only meaningful when <see cref="Type"/> is <see cref="FoundationType.Pile"/>.</summary>
    public int? PileCount { get; init; }

    /// <summary>Pile diameter, in meters. Only meaningful when <see cref="Type"/> is <see cref="FoundationType.Pile"/>.</summary>
    public double? PileDiameterM { get; init; }
}
