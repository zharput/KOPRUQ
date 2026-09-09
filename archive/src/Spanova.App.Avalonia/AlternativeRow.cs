using Spanova.Core.Model;

namespace Spanova.App.Avalonia;

/// <summary>
/// Read-only display row for the results table.
///
/// Only the first group of properties below comes from real generated
/// data. The second group exists to match the target mockup's column
/// layout (System, Concrete, Rebar, PT, Cost, CO2, ULS, SLS) but has no
/// backing computation yet - see
/// Spanova.Analysis/Cost/Carbon/Optimization ModuleStatus.cs. They
/// render as "—" rather than a fabricated number, per CLAUDE.md's
/// "do not invent engineering figures" rule.
/// </summary>
public sealed class AlternativeRow
{
    private const string NotAvailable = "—";

    public AlternativeRow(BridgeAlternative alternative, int displayIndex)
    {
        Alternative = alternative;
        DisplayId = $"{displayIndex:000}";
    }

    public BridgeAlternative Alternative { get; }

    // ----- Real, computed from the generated alternative -----

    public string DisplayId { get; }
    public Guid Id => Alternative.Id;
    public int SpanCount => Alternative.SpanCount;
    public double SpanLengthM => Math.Round(Alternative.SpanLengthsM.Count > 0 ? Alternative.SpanLengthsM[0] : 0, 3);
    public int GirderCount => Alternative.GirderCount;
    public double GirderDepthM => Alternative.GirderDepthM;
    public double TotalLengthM => Math.Round(Alternative.TotalLengthM, 3);

    /// <summary>e.g. "6 x 40" - matches the mockup's "Spans" column format.</summary>
    public string SpansText => $"{SpanCount} x {SpanLengthM:0.##}";

    /// <summary>P01 only generates this one bridge system - see spec section 12.</summary>
    public string System => "Precast";

    /// <summary>Every row here already passed Spanova.Rules - see Spanova.Rules.RuleEngine.</summary>
    public string Status => "✓";

    // ----- Not implemented yet (Spanova.Analysis / Cost / Carbon / Optimization) -----

    public string ConcreteVolume => NotAvailable;
    public string Rebar => NotAvailable;
    public string PostTensioning => NotAvailable;
    public string Cost => NotAvailable;
    public string CarbonEmissions => NotAvailable;
    public string PierDiameter => NotAvailable;
    public string Uls => NotAvailable;
    public string Sls => NotAvailable;

    /// <summary>Lower-cased blob used by the results-table search box.</summary>
    public string SearchBlob => $"{DisplayId} {System} {SpansText}".ToLowerInvariant();
}
