using System.Text.Json;
using System.Text.Json.Serialization;
using Spanova.Core.Model;

namespace Spanova.Data;

/// <summary>
/// Reads and writes .spanova project files as human-readable JSON
/// (spec section 14). SQLite-backed storage for large alternative/result
/// sets is a later-phase concern, not part of Prototype P01.
/// </summary>
public static class ProjectFileService
{
    public const string FileExtension = ".spanova";

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };

    public static void Save(SpanovaProject project, string filePath)
    {
        var json = JsonSerializer.Serialize(project, Options);
        File.WriteAllText(filePath, json);
    }

    public static SpanovaProject Load(string filePath)
    {
        var json = File.ReadAllText(filePath);
        return JsonSerializer.Deserialize<SpanovaProject>(json, Options)
               ?? throw new InvalidDataException($"'{filePath}' did not deserialize to a valid SPANOVA project.");
    }
}
