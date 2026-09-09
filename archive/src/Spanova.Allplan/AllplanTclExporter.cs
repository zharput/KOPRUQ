using System.Globalization;
using Spanova.Core.Model;

namespace Spanova.Allplan;

/// <summary>
/// Exports a BridgeAlternative as a Tcl variable script intended to seed
/// an ALLPLAN Civil bridge model (spec section 13).
///
/// *** DRAFT / UNVERIFIED SCHEMA ***
/// Per spec section 15/19 ("do not invent missing engineering/software
/// requirements"), this exporter does NOT claim to emit real ALLPLAN
/// Civil Tcl API calls - I have no verified reference for ALLPLAN Civil's
/// (SCALE-derived) bridge Tcl object model, unlike the general Allplan
/// PythonParts API used elsewhere in this project. What it produces is a
/// clearly-namespaced, self-documenting set of "spanova(...)" Tcl
/// variables carrying the selected alternative's parameters. Before this
/// is wired to a real ALLPLAN Civil import, an engineer with ALLPLAN
/// Civil's Tcl/API documentation must confirm (or replace) the actual
/// procedure calls needed - see docs/allplan-integration.md.
/// </summary>
public sealed class AllplanTclExporter
{
    public string Export(BridgeAlternative alternative, BridgeDefinition bridge)
    {
        var ci = CultureInfo.InvariantCulture;
        var writer = new System.Text.StringBuilder();

        writer.AppendLine("# SPANOVA -> ALLPLAN Civil export");
        writer.AppendLine("# DRAFT SCHEMA - not verified against the real ALLPLAN Civil Tcl API.");
        writer.AppendLine("# See docs/allplan-integration.md before using this to drive ALLPLAN Civil.");
        writer.AppendLine($"# Generated: {DateTime.UtcNow:O}");
        writer.AppendLine();

        writer.AppendLine("array set spanova {}");
        writer.AppendLine($"set spanova(bridge_name)          \"{Escape(bridge.BridgeName)}\"");
        writer.AppendLine($"set spanova(total_length_m)       {bridge.TotalLengthM.ToString("0.###", ci)}");
        writer.AppendLine($"set spanova(deck_width_m)         {bridge.DeckWidthM.ToString("0.###", ci)}");
        writer.AppendLine($"set spanova(span_count)           {alternative.SpanCount}");
        writer.AppendLine($"set spanova(girder_count)         {alternative.GirderCount}");
        writer.AppendLine($"set spanova(girder_depth_m)       {alternative.GirderDepthM.ToString("0.###", ci)}");
        writer.AppendLine();

        writer.AppendLine("set spanova(span_lengths_m) [list \\");
        for (var i = 0; i < alternative.SpanLengthsM.Count; i++)
        {
            var isLast = i == alternative.SpanLengthsM.Count - 1;
            writer.AppendLine($"    {alternative.SpanLengthsM[i].ToString("0.###", ci)}{(isLast ? "" : " \\")}");
        }
        writer.AppendLine("]");

        return writer.ToString();
    }

    public void ExportToFile(BridgeAlternative alternative, BridgeDefinition bridge, string filePath)
    {
        File.WriteAllText(filePath, Export(alternative, bridge));
    }

    private static string Escape(string value) => value.Replace("\"", "\\\"");
}
