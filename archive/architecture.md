# SPANOVA Architecture

Status: reflects Prototype P01. See `SPANOVA_MASTER_SPEC.md` for the full
product vision this implements a first slice of.

## Module map

```
SPANOVA.sln
src/
├── Spanova.App           WPF desktop shell (PROJECT | DESIGN SPACE | GENERATE | RESULTS)
├── Spanova.Core           Bridge Kernel domain model - solver-independent, SI units
├── Spanova.Geometry        placeholder - alignment/terrain/cross-section primitives
├── Spanova.Rules          IEngineeringRule + RuleEngine - feasibility checks
├── Spanova.Generative     AlternativeGenerator - enumerates & filters the design space
├── Spanova.Analysis        placeholder - solver-independent result contracts
├── Spanova.Allplan        ALLPLAN Civil adapter (draft Tcl export only, see below)
├── Spanova.Optimization    placeholder - Pareto / multi-objective optimization
├── Spanova.Cost             placeholder - construction cost estimation
├── Spanova.Carbon           placeholder - embodied carbon estimation
├── Spanova.Data           SpanovaProject <-> .spanova JSON serialization
└── Spanova.Reporting        placeholder - formatted engineering reports
tests/
├── Spanova.Core.Tests
├── Spanova.Rules.Tests
└── Spanova.Generative.Tests
```

Placeholder projects contain a single `ModuleStatus` class stating they
are unimplemented and why (per-project reasoning: which spec section
excludes them from the current milestone). They exist so the solution
matches the full architecture in spec section 11 without pretending any
of that scope has been built - see "Development Philosophy" (spec
section 16): don't implement features before a milestone calls for them.

## Dependency direction

```
Spanova.Geometry  <-  Spanova.Core  <-  Spanova.Rules  <-  Spanova.Generative  <-  Spanova.App
                                     <-  Spanova.Data                          <-
                                     <-  Spanova.Allplan                      <-
                                     <-  Spanova.Analysis, Optimization, Cost, Carbon, Reporting (skeleton only)
```

Every dependency points toward `Spanova.Core`; nothing in `Spanova.Core`
references an adapter, UI, or persistence project. This is the mechanism
that keeps the spec's "solver-specific objects are forbidden inside
Spanova.Core" rule (section 5) enforceable by the compiler, not just by
convention.

## Data flow in Prototype P01

```
PROJECT tab (BridgeDefinition) ─┐
DESIGN SPACE tab (DesignSpace) ─┴─> AlternativeGenerator.Generate()
                                        │
                                        ├─ enumerates (span count, girder count, girder depth)
                                        │  combinations from the design space
                                        │
                                        └─> RuleEngine.Evaluate() per candidate
                                                │
                                                ├─ feasible  -> shown in RESULTS table
                                                └─ rejected  -> kept with failure reasons (not shown in P01 UI)

RESULTS tab: engineer selects one feasible BridgeAlternative
   -> AllplanTclExporter.Export() -> draft .tcl file (spec section 13, first milestone only)

Project menu: SpanovaProject (Bridge + DesignSpace + GeneratedAlternatives + SelectedAlternativeId)
   -> ProjectFileService.Save/Load -> *.spanova JSON file (spec section 14)
```

## Open Assumptions

These are places where the master specification left a concrete detail
unstated. Per spec section 15/19 ("do not invent missing requirements"),
each is implemented as the simplest reading that stays faithful to the
text, and flagged here plus in the relevant source file's doc comment so
it can be revisited deliberately rather than discovered by accident.

1. **Uniform span layouts only.** `AlternativeGenerator` generates
   alternatives where every span in a given alternative has the same
   length (`TotalLengthM / SpanCount`). The spec's Generative Mode
   example gives a single `Span = 35-45 m` range per alternative, not a
   per-span breakdown, so this was read as the intended P01 scope.
   Non-uniform layouts (e.g. shorter end spans) are a later-phase change
   to `AlternativeGenerator`, not a `Spanova.Core` model change (the
   model already stores a list of span lengths).

2. **Girder-depth enumeration step (`DesignSpace.GirderDepthStepM`,
   default 0.10 m).** The spec gives continuous ranges
   (`GirderDepth = 1.80-2.50 m`) but P01's generator is combinatorial, so
   it needs a discretization step. This is a UI/algorithm knob, not an
   engineering rule - it controls how many alternatives are considered,
   not which ones are structurally valid. It is exposed as a DESIGN
   SPACE field so the engineer controls it directly, and defaults to
   0.10 m as a round, auditable number.

3. **No structural proportioning rules implemented yet** (e.g. girder
   depth/span ratio limits, girder spacing rules). The spec's rule
   examples (section 8) are illustrative patterns, not concrete numeric
   standards. `Spanova.Rules` currently contains only rules that are
   direct, non-invented consequences of the engineer's own inputs (span
   inside the requested range, spans sum to the requested total length,
   girder count/depth inside the requested range). Real proportioning
   rules must be added later with a source/code reference, units,
   assumptions and a validation example (spec section 15) - not
   invented to make P01 "feel" more complete.

4. **ALLPLAN Civil Tcl export is an unverified draft schema.** See
   `docs/allplan-integration.md`. `Spanova.Allplan` writes clearly-named
   `spanova(...)` Tcl variables, not real ALLPLAN Civil API calls, because
   no verified reference for ALLPLAN Civil's bridge Tcl object model was
   available while building P01.

5. **`.spanova` files are plain indented JSON** via `System.Text.Json`
   (spec section 14 explicitly allows this for the initial format). No
   schema versioning field exists yet - add one before the file format
   needs to change in a breaking way.

6. **No dependency-injection container / MVVM framework.** `Spanova.App`
   uses a hand-rolled `RelayCommand`/`ObservableObject` pair. This keeps
   the P01 dependency graph minimal (spec section 16, "do not
   over-engineer the first prototype"); revisit if the UI grows past a
   single window.

7. **"Design Cockpit" mockup fidelity (UI shell only, not new backend
   scope).** The user supplied a full target-product mockup (sidebar nav,
   ribbon tabs Project/Geometry/Design Space/Generate/Analyze/Optimize/
   Results/Report, site map, terrain chart, 3D view, a Results table with
   Cost/CO2/ULS/SLS columns, a Selected-Alternative card). `Spanova.App`'s
   window was restyled to match this shell, with three deliberate,
   documented simplifications rather than a pixel-perfect clone:
   - The mockup shows every panel on one composite screen; this build
     splits that content across the *real* ribbon tabs it belongs to
     (Project: project info + geometry previews; Design Space: ranges;
     Generate: button + summary; Results: table + selected-alternative
     card) so the tab labels stay meaningful navigation rather than
     decoration.
   - Left-sidebar nav items and the map/3D-view/terrain images are
     **static placeholders** (per the user's own instruction to put
     "something random" there for now) - not wired to page switching or
     real geometry/site data.
   - Results-table columns and summary numbers that depend on
     `Spanova.Analysis`/`Cost`/`Carbon`/`Optimization` (Concrete, Rebar,
     PT, Cost, CO2, ULS, SLS, Analyzed/Passed/Pareto counts) render as
     "—" rather than a fabricated number - see `AlternativeRow.cs`'s
     "Not implemented yet" region and `MainViewModel.cs`'s
     `DecorativeOnly` region.

8. **`Spanova.App.Avalonia` is the desktop shell.** An earlier WPF
   prototype (`Spanova.App`) was built first, then replaced per the
   user's explicit request to redo the UI in Avalonia as a single
   scrollable page with no top tab bar (sidebar nav items scroll to a
   section instead of switching pages - see `MainWindow.axaml.cs`'s
   `OnNavItemClick`). The WPF project was removed from the solution and
   deleted at the user's request once the Avalonia version was working.
