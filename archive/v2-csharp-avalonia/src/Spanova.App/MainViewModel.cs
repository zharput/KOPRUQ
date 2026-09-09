using System.Collections.ObjectModel;
using System.Globalization;
using Spanova.Core.Model;
using Spanova.Generative;
using Spanova.Rules;

namespace Spanova.App;

/// <summary>
/// View model over the 9 fields spec section 20 names, plus GENERATE.
///
/// P02's success criterion ("UI data correctly reaches the Bridge Kernel
/// / DesignSpace") is still shown via <see cref="KernelStateSummary"/>.
/// P03 adds the actual generation step: GENERATE now also calls
/// <see cref="AlternativeGenerator"/> and populates <see cref="Alternatives"/>
/// for display in a plain table (spec section 20, P03: "Display
/// alternatives in a table" - not the polished P10 dashboard).
/// </summary>
public sealed class MainViewModel : ObservableObject
{
    private string _bridgeName = "VIA-35";
    private double _bridgeLengthM = 210;
    private double _deckWidthM = 13.80;
    private double _minSpanM = 30;
    private double _maxSpanM = 45;
    private int _minGirderCount = 4;
    private int _maxGirderCount = 8;
    private double _minGirderDepthM = 1.8;
    private double _maxGirderDepthM = 2.5;

    private string _kernelStateSummary = "(not generated yet)";

    public MainViewModel()
    {
        GenerateCommand = new RelayCommand(Generate);
    }

    public string BridgeName
    {
        get => _bridgeName;
        set => SetField(ref _bridgeName, value);
    }

    public double BridgeLengthM
    {
        get => _bridgeLengthM;
        set => SetField(ref _bridgeLengthM, value);
    }

    public double DeckWidthM
    {
        get => _deckWidthM;
        set => SetField(ref _deckWidthM, value);
    }

    public double MinSpanM
    {
        get => _minSpanM;
        set => SetField(ref _minSpanM, value);
    }

    public double MaxSpanM
    {
        get => _maxSpanM;
        set => SetField(ref _maxSpanM, value);
    }

    public int MinGirderCount
    {
        get => _minGirderCount;
        set => SetField(ref _minGirderCount, value);
    }

    public int MaxGirderCount
    {
        get => _maxGirderCount;
        set => SetField(ref _maxGirderCount, value);
    }

    public double MinGirderDepthM
    {
        get => _minGirderDepthM;
        set => SetField(ref _minGirderDepthM, value);
    }

    public double MaxGirderDepthM
    {
        get => _maxGirderDepthM;
        set => SetField(ref _maxGirderDepthM, value);
    }

    public RelayCommand GenerateCommand { get; }

    /// <summary>
    /// Read-only proof that the bound UI values reached a real
    /// Spanova.Core.Model.Project (Bridge + DesignSpace), formatted as
    /// plain text rather than a dashboard.
    /// </summary>
    public string KernelStateSummary
    {
        get => _kernelStateSummary;
        private set => SetField(ref _kernelStateSummary, value);
    }

    /// <summary>Feasible span-layout/girder alternatives from the last GENERATE (spec section 20, P03).</summary>
    public ObservableCollection<AlternativeRow> Alternatives { get; } = new();

    private AlternativeRow? _selectedRow;

    /// <summary>The row selected in the results table - drives the P05 elevation preview.</summary>
    public AlternativeRow? SelectedRow
    {
        get => _selectedRow;
        set => SetField(ref _selectedRow, value);
    }

    private string _resultSummary = "(not generated yet)";
    public string ResultSummary
    {
        get => _resultSummary;
        private set => SetField(ref _resultSummary, value);
    }

    private void Generate()
    {
        var project = new Project
        {
            ProjectName = BridgeName,
            Bridge = new Bridge
            {
                BridgeName = BridgeName,
                TotalLengthM = BridgeLengthM,
                DeckWidthM = DeckWidthM,
            },
            DesignSpace = new DesignSpace
            {
                MinSpanM = MinSpanM,
                MaxSpanM = MaxSpanM,
                MinGirderCount = MinGirderCount,
                MaxGirderCount = MaxGirderCount,
                MinGirderDepthM = MinGirderDepthM,
                MaxGirderDepthM = MaxGirderDepthM,
            },
        };

        var ci = CultureInfo.InvariantCulture;
        KernelStateSummary =
            $"Project.Bridge.BridgeName   = \"{project.Bridge.BridgeName}\"\n" +
            $"Project.Bridge.TotalLengthM = {project.Bridge.TotalLengthM.ToString(ci)}\n" +
            $"Project.Bridge.DeckWidthM   = {project.Bridge.DeckWidthM.ToString(ci)}\n" +
            $"Project.DesignSpace.Span         = [{project.DesignSpace.MinSpanM.ToString(ci)}, {project.DesignSpace.MaxSpanM.ToString(ci)}] m\n" +
            $"Project.DesignSpace.GirderCount  = [{project.DesignSpace.MinGirderCount}, {project.DesignSpace.MaxGirderCount}]\n" +
            $"Project.DesignSpace.GirderDepthM = [{project.DesignSpace.MinGirderDepthM.ToString(ci)}, {project.DesignSpace.MaxGirderDepthM.ToString(ci)}] m";

        Alternatives.Clear();
        SelectedRow = null;
        try
        {
            // RuleEngine() with no rules: none has been approved yet
            // (spec section 22) - see docs/roadmap.md, P04.
            var results = new AlternativeGenerator().GenerateWithRules(project.Bridge, project.DesignSpace, new RuleEngine());
            foreach (var (alt, ruleResult) in results)
            {
                Alternatives.Add(new AlternativeRow(alt, ruleResult));
            }

            var feasibleCount = results.Count(r => r.Result.IsFeasible);
            ResultSummary = results.Count == 0
                ? "0 candidates - widen the ranges."
                : $"{results.Count} candidate(s), {feasibleCount} feasible.";
        }
        catch (ArgumentException ex)
        {
            ResultSummary = $"Could not generate: {ex.Message}";
        }
    }
}
