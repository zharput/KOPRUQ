# SPANOVA Roadmap

Milestones and gating rules are defined in `docs/SPANOVA_MASTER_SPEC.md`,
section 20. This file tracks status only. Never start a milestone marked
"Not started" without the engineer's explicit approval (spec section 24).

| Milestone | Scope | Status |
|---|---|---|
| P00 | Solution, 16 projects, minimal dependency graph, tests scaffolded, docs structure, CLAUDE.md | **Done** |
| P01 | Bridge Kernel: `Project`, `Bridge`, `SpanLayout`, `Span`, `Deck`, `Girder`, `Pier`, `Foundation`, `DesignSpace`, `BridgeAlternative`; SI units; tests | **Done** |
| P02 | Basic Avalonia UI: 9 raw fields (bridge name/length/deck width/span & girder-count & girder-depth ranges) + GENERATE button, MVVM, no dashboard yet | **Done** |
| P03 | First computational design engine: feasible span-layout/girder alternative generation from a `DesignSpace`, shown in a table | **Done** |
| P04 | Engineering Rules Engine infrastructure + only the rules the engineer explicitly provides and approves | **Infrastructure done** - **zero rules implemented, waiting on the engineer** |
| P05 | Simple bridge elevation/profile preview (no photorealistic 3D) | **Done** (this session) |
| P06 | `Spanova.Allplan` adapter: `BridgeAlternative` -> ALLPLAN Civil Tcl/API representation (no GUI automation yet) | Not started |
| P07 | Structural analysis integration: SPANOVA -> ALLPLAN -> analysis -> results -> SPANOVA | Not started |
| P08 | Quantities, then cost, then carbon | Not started |
| P09 | Generative multi-objective optimization, Pareto front | Not started |
| P10 | Professional "Design Cockpit" UI (Project/Geometry/Design Space/Generate/Analyze/Optimize/Results/Report) | Not started |
| P11 | AI agent (natural-language -> deterministic SPANOVA parameters; never a structural-safety authority) | Not started |
| P12 | Additional solver adapters (MIDAS Civil NX, SCIA Engineer, others) | Not started |

## P00 — what was actually done

- [x] `SPANOVA.sln` with all 16 projects (12 `src/`, 4 `tests/`)
- [x] Minimal dependency graph wired (see `docs/architecture.md`) - every
      library depends on `Spanova.Core` only, except `Spanova.Generative`
      (`Core` + `Rules`); `Spanova.App` depends on `Core` only
- [x] `docs/SPANOVA_MASTER_SPEC.md` (authoritative spec, saved verbatim)
- [x] `docs/architecture.md`, `docs/roadmap.md` (this file)
- [x] `CLAUDE.md` with the working method and engineering safety rules
- [x] Solution builds successfully (P00's stated success criterion,
      spec section 20)
- [ ] No domain model, no UI content, no rules, no analysis, no ALLPLAN
      integration - all correctly out of scope for P00

## P01 — what was actually done

- [x] `Spanova.Core/Model`: `Bridge`, `Span`, `SpanLayout`, `Deck`,
      `Girder`, `Pier`, `Foundation` (+ `FoundationType` enum),
      `DesignSpace`, `BridgeAlternative`, `Project` — every field sourced
      from spec sections 6-9, none invented (see `docs/architecture.md`
      for the two documented gaps: spread-footing dimensions, pier-type
      taxonomy)
- [x] SI units throughout (`double`, meters, `...M` suffix naming)
- [x] 8 new tests in `Spanova.Core.Tests` (`SpanLayoutTests`,
      `BridgeAlternativeTests`, `ProjectTests`) — all passing
- [x] Solution builds successfully; P01's success criterion ("a bridge
      can be represented independently of ALLPLAN") is met by
      `BridgeAlternativeTests.CanBeFullyConstructed_WithoutAnyAllplanOrExternalType`
- [ ] No rules, no analysis, no ALLPLAN integration, no UI, no
      persistence yet — all correctly out of scope for P01

## P02 — what was actually done

- [x] `Spanova.App`: plain `MainWindow.axaml` with the 9 fields named in
      spec section 20 (Bridge Name, Bridge Length, Deck Width, Min/Max
      Span, Min/Max Girder Count, Min/Max Girder Depth) + a GENERATE
      button - deliberately not a dashboard (no sidebar, tabs, charts)
- [x] MVVM: `MainViewModel` (hand-rolled `ObservableObject`/`RelayCommand`,
      no external MVVM package yet - consistent with spec section 21,
      "avoid unnecessary abstraction")
- [x] GENERATE builds a real `Spanova.Core.Model.Project` (`Bridge` +
      `DesignSpace`) from the bound fields and displays it back as plain
      text (`KernelStateSummary`) - this is P02's success criterion made
      observable ("UI data correctly reaches the Bridge Kernel /
      DesignSpace"), without pulling in `Spanova.Generative` (P03) or
      `Spanova.Data` (not yet referenced by `Spanova.App`)
- [x] Solution builds (0 errors/warnings); app launches cleanly
      (smoke-tested)
- [ ] No alternative generation, no rules, no persistence, no polished
      UI yet - all correctly out of scope for P02

## P03 — what was actually done

- [x] `Spanova.Generative.AlternativeGenerator`: enumerates uniform-span
      layouts x girder count x girder depth (step
      `DesignSpace.GirderDepthStepM`, default 0.10 m - a search
      resolution, not an engineering quantity), keeps only combinations
      whose span/girder-count/girder-depth fall inside the requested
      ranges. No Rules Engine dependency used yet (Spanova.Rules has no
      content until P04) - feasibility here is purely definitional.
- [x] `BridgeAlternative.Deck/Pier/Foundation` changed from `required` to
      nullable (see `BridgeAlternative.cs`'s doc comment) - P03's own
      scope is span-layout + girder only, so P01's model was adjusted
      rather than inventing placeholder Deck/Pier/Foundation values.
- [x] 6 new tests in `Spanova.Generative.Tests`, built directly against
      spec section 20's own P03 example (210 m, 30-45 m, 4-8, 1.8-2.5 m):
      confirms span counts {5,6,7}, 120 total combinations, empty-result
      and invalid-range behaviour.
- [x] `Spanova.App` now references `Spanova.Generative`; GENERATE also
      runs the generator and shows results in a plain `DataGrid` (spec
      section 20, P03: "Display alternatives in a table" - still not the
      P10 dashboard).
- [x] Solution builds (0 errors/warnings); 14 tests pass; app launches
      cleanly (smoke-tested).
- [ ] No rules engine, no analysis, no persistence, no polished UI -
      correctly out of scope for P03.

## P04 — what was actually done

- [x] `Spanova.Rules.IEngineeringRule` (RuleId, Description, Category,
      Evaluate) + `RuleEvaluation` - the runtime contract every future
      real rule implements. Source/units/input-parameters/limit-value/
      assumptions are a documentation convention (XML doc comment on the
      implementing class), not runtime fields - see the interface's own
      doc comment.
- [x] `Spanova.Rules.RuleEngine` - runs a configured rule set against one
      `BridgeAlternative`, returns a traceable `RuleEngineResult`
      (pass/fail + per-rule reasons). Defaults to **zero rules**.
- [x] `Spanova.Generative.AlternativeGenerator.GenerateWithRules` - wires
      P03's generator to P04's engine so every generated alternative
      carries an accept/reject result (P04's stated success criterion).
- [x] `Spanova.App` now shows a Status column ("Pass (no rules yet)" /
      "Pass" / "Reject" + reasons).
- [x] 10 new tests (5 in `Spanova.Rules.Tests`, 3 in
      `Spanova.Generative.Tests` for the integration, using clearly
      labelled test-double rules) - 22 tests total, all green.
- [ ] **Zero real engineering rules implemented** - this is intentional,
      not a gap to "finish later" silently. Spec section 22: "Do NOT
      invent engineering rules. I will provide engineering rules and
      validate them." The engine is ready to receive them the moment the
      engineer supplies the first one (with its source, units, limit
      value and a validation example).

## P05 — what was actually done

- [x] Selecting a row in the results `DataGrid` now draws a schematic
      elevation on a plain `Canvas` (deck block sized by girder depth,
      vertical markers at every span boundary, span-length labels, a
      summary caption) - code-behind (`MainWindow.axaml.cs`), not a
      custom control or 3D renderer.
- [x] Explicitly **not** to true scale: girder depth uses a separate,
      exaggerated px/m factor from the horizontal axis so it stays
      visible (a 2 m-deep girder over a 200+ m bridge would be
      sub-pixel at one consistent scale) - stated in the UI caption, not
      hidden.
- [x] Pier markers show **position only, no height** - `Pier` is still
      `null` on every generated alternative (P03's own scope), so no
      height value exists to draw; drawing an invented height would
      violate spec section 22. The UI caption says this explicitly.
- [x] Solution builds (0 errors/warnings); all 22 existing tests still
      pass (P05 added no new domain/business logic to unit-test - its
      success criterion, "selected alternative can be visually
      inspected," is a UI-observable property, not something to assert
      in xUnit); app launches cleanly (smoke-tested).
- [x] **Bugfix during engineer testing:** row selection did nothing.
      Root cause: `App.axaml` never included the DataGrid package's own
      theme (`avares://Avalonia.Controls.DataGrid/Themes/Fluent.xaml`) -
      without it, `DataGridRow`/`DataGridCell` have no control template,
      so pointer clicks never reach the selection logic, even though
      the grid still renders text. (An earlier attempt to add this used
      the wrong file extension, `.axaml` instead of the actual
      `Themes/Fluent.xaml`, failed to resolve, and was removed instead
      of fixed - confirmed by reading the DataGrid source at
      github.com/AvaloniaUI/Avalonia.Controls.DataGrid.) Also switched
      the elevation trigger from `MainViewModel.SelectedRow`'s
      TwoWay binding to `DataGrid.SelectionChanged` directly, and made
      `DrawElevation` show an explicit placeholder/error message instead
      of ever leaving the canvas silently blank.

## Note on the archived first-pass build

Before this disciplined restart, an earlier session built a working
end-to-end prototype informally (domain model, rules, generative engine,
a full Avalonia dashboard UI, a draft ALLPLAN Tcl exporter) without
following the milestone-gate process above. At the engineer's request it
was moved to `archive/` rather than discarded. It may be useful as a
reference for *how* something was solved (e.g. the Avalonia dual-range
slider approach, the `AlternativeGenerator` combinatorics), but it is not
an approved implementation of any milestone above - each milestone must
still be proposed, discussed, and approved on its own before being
(re)implemented here.
