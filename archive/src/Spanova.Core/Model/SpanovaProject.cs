namespace Spanova.Core.Model;

/// <summary>
/// Root object persisted to a .spanova project file.
/// </summary>
public sealed class SpanovaProject
{
    public string ProjectName { get; set; } = string.Empty;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public BridgeDefinition Bridge { get; set; } = new();

    public DesignSpace DesignSpace { get; set; } = new();

    public List<BridgeAlternative> GeneratedAlternatives { get; set; } = new();

    /// <summary>Id of the alternative the engineer selected in the RESULTS tab, if any.</summary>
    public Guid? SelectedAlternativeId { get; set; }

    public BridgeAlternative? SelectedAlternative =>
        SelectedAlternativeId is null
            ? null
            : GeneratedAlternatives.FirstOrDefault(a => a.Id == SelectedAlternativeId);
}
