namespace Spanova.Core.Model;

/// <summary>
/// The root SPANOVA project object (spec section 18 describes the
/// eventual .spanova project file; persistence itself is out of scope
/// for P01, see docs/roadmap.md).
/// </summary>
public sealed class Project
{
    public string ProjectName { get; set; } = string.Empty;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public Bridge Bridge { get; set; } = new();

    public DesignSpace DesignSpace { get; set; } = new();

    public List<BridgeAlternative> GeneratedAlternatives { get; set; } = new();

    /// <summary>Id of the alternative the engineer has selected, if any.</summary>
    public Guid? SelectedAlternativeId { get; set; }

    public BridgeAlternative? SelectedAlternative =>
        SelectedAlternativeId is null
            ? null
            : GeneratedAlternatives.FirstOrDefault(a => a.Id == SelectedAlternativeId);
}
