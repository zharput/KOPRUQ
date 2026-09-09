using System.Collections.ObjectModel;
using Avalonia.Controls;
using Avalonia.Platform.Storage;
using Spanova.Allplan;
using Spanova.Core.Model;
using Spanova.Data;
using Spanova.Generative;

namespace Spanova.App.Avalonia;

/// <summary>
/// View model for the SPANOVA single-screen window (no top tabs - the
/// whole cockpit is one page, per the user's Avalonia redesign request).
///
/// Real, working logic (spec section 17, Prototype P01): project fields,
/// design space ranges, GENERATE, the results table (+ search), save/load
/// .spanova, and the draft ALLPLAN Tcl export.
///
/// The "DecorativeOnly" region backs UI elements added to match the
/// target mockup (Objectives, Constraints, extra geometry sliders) that
/// have no Spanova.Optimization/Analysis/Cost/Carbon implementation yet.
/// Their values are local view-state only - never persisted to
/// SpanovaProject, never fed into AlternativeGenerator.
/// </summary>
public sealed class MainViewModel : ObservableObject
{
    private readonly Window _owner;

    private SpanovaProject _project = NewProject();

    private string _statusMessage = "Ready.";
    private string _lastSavedText = "Not saved yet";
    private int _candidateCount;
    private int _feasibleCount;
    private int _rejectedCount;
    private AlternativeRow? _selectedRow;
    private string _searchText = string.Empty;

    public MainViewModel(Window owner)
    {
        _owner = owner;

        GenerateCommand = new RelayCommand(Generate);
        NewProjectCommand = new RelayCommand(() => Project = NewProject());
        SaveProjectCommand = new AsyncRelayCommand(SaveProjectAsync);
        OpenProjectCommand = new AsyncRelayCommand(OpenProjectAsync);
        ExportSelectedCommand = new AsyncRelayCommand(ExportSelectedAsync, () => SelectedRow is not null);

        RefreshAlternativesFromProject();
    }

    public SpanovaProject Project
    {
        get => _project;
        private set
        {
            if (SetField(ref _project, value))
            {
                RefreshAlternativesFromProject();

                foreach (var name in new[]
                {
                    nameof(ProjectName), nameof(BridgeName), nameof(TotalLengthM), nameof(DeckWidthM),
                    nameof(Location), nameof(DesignStandard), nameof(ProjectPhase),
                    nameof(MinSpanM), nameof(MaxSpanM), nameof(MinGirderCount), nameof(MaxGirderCount),
                    nameof(MinGirderDepthM), nameof(MaxGirderDepthM), nameof(GirderDepthStepM),
                })
                {
                    OnPropertyChanged(name);
                }
            }
        }
    }

    // ----- Project fields (real) -----

    public string ProjectName
    {
        get => Project.ProjectName;
        set { Project.ProjectName = value; OnPropertyChanged(); }
    }

    public string BridgeName
    {
        get => Project.Bridge.BridgeName;
        set { Project.Bridge.BridgeName = value; OnPropertyChanged(); }
    }

    public double TotalLengthM
    {
        get => Project.Bridge.TotalLengthM;
        set { Project.Bridge.TotalLengthM = value; OnPropertyChanged(); OnPropertyChanged(nameof(HeroSpansText)); }
    }

    public double DeckWidthM
    {
        get => Project.Bridge.DeckWidthM;
        set { Project.Bridge.DeckWidthM = value; OnPropertyChanged(); }
    }

    public string Location
    {
        get => Project.Bridge.Location;
        set { Project.Bridge.Location = value; OnPropertyChanged(); }
    }

    public string DesignStandard
    {
        get => Project.Bridge.DesignStandard;
        set { Project.Bridge.DesignStandard = value; OnPropertyChanged(); }
    }

    public string ProjectPhase
    {
        get => Project.Bridge.ProjectPhase;
        set { Project.Bridge.ProjectPhase = value; OnPropertyChanged(); }
    }

    /// <summary>Hero-image overlay text, e.g. "6 x 40 m" - derived from the last GENERATE run's first feasible alternative, else from the design space's own midpoint span count as a placeholder.</summary>
    public string HeroSpansText => Alternatives.Count > 0
        ? Alternatives[0].SpansText + " m"
        : "not generated yet";

    // ----- Design space (real) -----

    public double MinSpanM
    {
        get => Project.DesignSpace.MinSpanM;
        set { Project.DesignSpace.MinSpanM = value; OnPropertyChanged(); }
    }

    public double MaxSpanM
    {
        get => Project.DesignSpace.MaxSpanM;
        set { Project.DesignSpace.MaxSpanM = value; OnPropertyChanged(); }
    }

    public int MinGirderCount
    {
        get => Project.DesignSpace.MinGirderCount;
        set { Project.DesignSpace.MinGirderCount = value; OnPropertyChanged(); }
    }

    public int MaxGirderCount
    {
        get => Project.DesignSpace.MaxGirderCount;
        set { Project.DesignSpace.MaxGirderCount = value; OnPropertyChanged(); }
    }

    public double MinGirderDepthM
    {
        get => Project.DesignSpace.MinGirderDepthM;
        set { Project.DesignSpace.MinGirderDepthM = value; OnPropertyChanged(); }
    }

    public double MaxGirderDepthM
    {
        get => Project.DesignSpace.MaxGirderDepthM;
        set { Project.DesignSpace.MaxGirderDepthM = value; OnPropertyChanged(); }
    }

    public double GirderDepthStepM
    {
        get => Project.DesignSpace.GirderDepthStepM;
        set { Project.DesignSpace.GirderDepthStepM = value; OnPropertyChanged(); }
    }

    // ----- Generate (real) -----

    public RelayCommand GenerateCommand { get; }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetField(ref _statusMessage, value);
    }

    public int CandidateCount
    {
        get => _candidateCount;
        private set => SetField(ref _candidateCount, value);
    }

    public int FeasibleCount
    {
        get => _feasibleCount;
        private set => SetField(ref _feasibleCount, value);
    }

    public int RejectedCount
    {
        get => _rejectedCount;
        private set => SetField(ref _rejectedCount, value);
    }

    private void Generate()
    {
        try
        {
            var generator = new AlternativeGenerator();
            var result = generator.Generate(Project.Bridge, Project.DesignSpace);

            Project.GeneratedAlternatives = result.FeasibleAlternatives.ToList();
            Project.SelectedAlternativeId = null;

            RefreshAlternativesFromProject();

            CandidateCount = result.AllCandidates.Count;
            FeasibleCount = result.FeasibleAlternatives.Count;
            RejectedCount = result.RejectedAlternatives.Count;

            StatusMessage = FeasibleCount == 0
                ? $"{CandidateCount} candidate(s) generated, 0 feasible. Widen the design space."
                : $"{CandidateCount} candidate(s) generated -> {FeasibleCount} feasible.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Generation failed: {ex.Message}";
        }
    }

    // ----- Results table (real) -----

    private readonly List<AlternativeRow> _allRows = new();

    public ObservableCollection<AlternativeRow> Alternatives { get; } = new();

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetField(ref _searchText, value))
            {
                ApplySearchFilter();
            }
        }
    }

    private void ApplySearchFilter()
    {
        Alternatives.Clear();
        var needle = _searchText.Trim().ToLowerInvariant();
        foreach (var row in _allRows)
        {
            if (needle.Length == 0 || row.SearchBlob.Contains(needle))
            {
                Alternatives.Add(row);
            }
        }
    }

    public AlternativeRow? SelectedRow
    {
        get => _selectedRow;
        set
        {
            if (SetField(ref _selectedRow, value))
            {
                Project.SelectedAlternativeId = value?.Id;
                OnPropertyChanged(nameof(HasSelectedRow));
                ExportSelectedCommand.RaiseCanExecuteChanged();
            }
        }
    }

    public bool HasSelectedRow => SelectedRow is not null;

    public AsyncRelayCommand ExportSelectedCommand { get; }

    private async Task ExportSelectedAsync()
    {
        if (SelectedRow is null)
        {
            return;
        }

        var file = await _owner.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Export ALLPLAN Civil Tcl (draft)",
            SuggestedFileName = $"{Project.Bridge.BridgeName}_{SelectedRow.DisplayId}.tcl",
            FileTypeChoices = [new FilePickerFileType("Tcl script") { Patterns = ["*.tcl"] }],
        });

        if (file is null)
        {
            return;
        }

        try
        {
            var path = file.TryGetLocalPath() ?? file.Name;
            new AllplanTclExporter().ExportToFile(SelectedRow.Alternative, Project.Bridge, path);
            StatusMessage = $"Exported draft ALLPLAN Civil Tcl script to '{path}'.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Export failed: {ex.Message}";
        }
    }

    private void RefreshAlternativesFromProject()
    {
        _allRows.Clear();
        var index = 1;
        foreach (var alt in Project.GeneratedAlternatives)
        {
            _allRows.Add(new AlternativeRow(alt, index++));
        }
        ApplySearchFilter();
        OnPropertyChanged(nameof(HeroSpansText));
    }

    // ----- Project file commands (real) -----

    public RelayCommand NewProjectCommand { get; }
    public AsyncRelayCommand SaveProjectCommand { get; }
    public AsyncRelayCommand OpenProjectCommand { get; }

    public string LastSavedText
    {
        get => _lastSavedText;
        private set => SetField(ref _lastSavedText, value);
    }

    private static readonly FilePickerFileType SpanovaFileType =
        new("SPANOVA project") { Patterns = [$"*{ProjectFileService.FileExtension}"] };

    private async Task SaveProjectAsync()
    {
        var file = await _owner.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Save SPANOVA project",
            SuggestedFileName = string.IsNullOrWhiteSpace(Project.ProjectName) ? "project" : Project.ProjectName,
            DefaultExtension = ProjectFileService.FileExtension.TrimStart('.'),
            FileTypeChoices = [SpanovaFileType],
        });

        if (file is null)
        {
            return;
        }

        try
        {
            var path = file.TryGetLocalPath() ?? file.Name;
            ProjectFileService.Save(Project, path);
            LastSavedText = $"Saved just now ({DateTime.Now:HH:mm})";
            StatusMessage = $"Project saved to '{path}'.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Save failed: {ex.Message}";
        }
    }

    private async Task OpenProjectAsync()
    {
        var files = await _owner.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Open SPANOVA project",
            AllowMultiple = false,
            FileTypeFilter = [SpanovaFileType],
        });

        var file = files.FirstOrDefault();
        if (file is null)
        {
            return;
        }

        try
        {
            var path = file.TryGetLocalPath() ?? file.Name;
            Project = ProjectFileService.Load(path);
            LastSavedText = "Loaded from disk";
            StatusMessage = $"Project loaded from '{path}'.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Open failed: {ex.Message}";
        }
    }

    private static SpanovaProject NewProject() => new()
    {
        ProjectName = "VIA-35",
        Bridge = new BridgeDefinition
        {
            BridgeName = "VIA-35",
            TotalLengthM = 420,
            DeckWidthM = 13.80,
            Location = "Sibiu - Pitesti",
            DesignStandard = "Eurocode",
            ProjectPhase = "Concept Design",
        },
        DesignSpace = new DesignSpace
        {
            MinSpanM = 35,
            MaxSpanM = 65,
            MinGirderCount = 4,
            MaxGirderCount = 8,
            MinGirderDepthM = 1.8,
            MaxGirderDepthM = 2.5,
        },
    };

    // ===================== DecorativeOnly (mockup fidelity, no backend) =====================
    //
    // Local UI state only: not part of SpanovaProject, not saved to
    // .spanova, not read by AlternativeGenerator or Spanova.Rules. See
    // docs/architecture.md, "Open Assumptions", before wiring any of
    // these to real logic.

    public double SlabThicknessMinM { get; set; } = 0.22;
    public double SlabThicknessMaxM { get; set; } = 0.30;
    public double PierDiameterMinM { get; set; } = 1.8;
    public double PierDiameterMaxM { get; set; } = 2.8;
    public double PierHeightMaxM { get; set; } = 45;

    public bool BridgeSystemPrecastGirder { get; set; } = true;
    public bool BridgeSystemPscBoxGirder { get; set; }
    public bool BridgeSystemBalancedCantilever { get; set; }

    public bool ObjectiveMinimizeCost { get; set; } = true;
    public bool ObjectiveMinimizeCo2 { get; set; } = true;
    public bool ObjectiveMinimizeWeight { get; set; } = true;
    public bool ObjectiveMinimizeConstructionTime { get; set; }

    public bool ConstraintRiverNoPier { get; set; } = true;
    public bool ConstraintExistingRoad { get; set; } = true;
    public bool ConstraintProtectedArea { get; set; }
    public bool ConstraintMaxPierHeight { get; set; } = true;
    public bool ConstraintConstructabilityLimits { get; set; }
}
