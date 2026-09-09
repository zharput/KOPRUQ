namespace Spanova.Core.Model;

/// <summary>
/// Fixed, project-level facts about the bridge (spec section 9, "PROJECT"
/// group). All lengths are in meters (SI), per the SPANOVA unit policy
/// (spec section 7).
/// </summary>
public sealed class Bridge
{
    public string BridgeName { get; set; } = string.Empty;

    /// <summary>Total bridge length along the alignment, in meters.</summary>
    public double TotalLengthM { get; set; }

    /// <summary>Deck width, in meters.</summary>
    public double DeckWidthM { get; set; }
}
