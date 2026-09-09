namespace Spanova.Core.Model;

/// <summary>
/// Fixed, engineer-provided facts about the bridge that do not vary between
/// generated alternatives (the "PROJECT" tab in Prototype P01).
/// All lengths are in meters (SI), per the SPANOVA unit policy.
/// </summary>
public sealed class BridgeDefinition
{
    public string BridgeName { get; set; } = string.Empty;

    /// <summary>Total bridge length along the alignment, in meters.</summary>
    public double TotalLengthM { get; set; }

    /// <summary>Deck width, in meters.</summary>
    public double DeckWidthM { get; set; }

    /// <summary>
    /// Free-text project location. Descriptive metadata only - not used
    /// by any generation or rule logic in Prototype P01.
    /// </summary>
    public string Location { get; set; } = string.Empty;

    /// <summary>
    /// Free-text design standard label (e.g. "Eurocode"). Descriptive
    /// metadata only in Prototype P01 - Spanova.Rules does not yet apply
    /// standard-specific checks (see docs/engineering-model.md).
    /// </summary>
    public string DesignStandard { get; set; } = string.Empty;

    /// <summary>Free-text project phase label (e.g. "Concept Design"). Descriptive metadata only.</summary>
    public string ProjectPhase { get; set; } = string.Empty;
}
