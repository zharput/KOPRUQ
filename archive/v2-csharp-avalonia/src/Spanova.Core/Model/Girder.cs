namespace Spanova.Core.Model;

/// <summary>
/// Superstructure girder sizing for one bridge alternative (spec section
/// 9). Prototype scope is the first bridge type only - PRECAST GIRDER
/// VIADUCT (spec section 8) - so one uniform girder type per alternative.
/// </summary>
public sealed class Girder
{
    public int Count { get; init; }

    /// <summary>Girder depth, in meters.</summary>
    public double DepthM { get; init; }

    /// <summary>Girder spacing (centre-to-centre), in meters.</summary>
    public double SpacingM { get; init; }
}
