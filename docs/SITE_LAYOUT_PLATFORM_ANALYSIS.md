# SPANOVA Site/Corridor & Bridge Layout Platform - Architecture Analysis

Status: **analysis only, no code written.** Per the engineer's own
instruction (2026-09-10): review, propose, then stop for approval.

## 0. Relationship to the existing spec - this is not a new direction

`docs/SPANOVA_MASTER_SPEC.md` already named this scope, deliberately
deferred:

- Section 7 (Bridge Kernel) lists `Alignment`, `Terrain`, `Geotechnics`,
  `Constraints` directly under `Bridge` in "the long-term domain model"
  and says explicitly "Do NOT implement all of these immediately."
- Section 19 (original C# solution structure) names a `Spanova.Geometry`
  module for "Alignment, Span layout, Bridge geometry logic" - never
  built (see `docs/architecture.md`'s own "open questions" list, which
  already flagged this exact gap).
- Section 20's P10 UI description already lists "Site/alignment" and
  "Terrain profile" as target panels.

So this prompt is the master spec's own deferred scope, arriving now
with far more engineering detail than the original terse mentions - not
a contradiction of prior decisions. Nothing here should be read as
"start over"; it extends the existing solver-independent
`bridge-core` -> adapter architecture outward to cover *where* a bridge
sits before *how* it's structurally sized.

---

## A. Current state

| Area | State |
|---|---|
| Alignment (horizontal/vertical geometry, chainage) | **MISSING** - no code anywhere. `Bridge.totalLengthM` is a flat scalar the engineer types in, not derived from any alignment. |
| Terrain / DTM / elevation queries | **MISSING** - no terrain data, no elevation query of any kind. |
| GIS / satellite / map layers | **MISSING** - no map component exists in the frontend at all (P10's `ProjectPanel`/`HomePanel` are text/stat cards, not maps). |
| Site constraints (roads, rail, rivers, utilities, no-pier zones) | **MISSING** - no spatial concept exists; `BridgeAlternative` has no location at all, only abstract span lengths. |
| Bridge geometry / location | **PARTIAL** - `bridge-core`'s `Bridge`/`SpanLayout`/`Span`/`Girder`/`Pier`/`Foundation` model a bridge's own cross-section and span breakdown well, but carry zero spatial/chainage/coordinate information. A bridge today is a list of numbers, not a located object. |
| Bridge alternatives (structural) | **EXISTS, but scoped narrower than requested** - `generative-engine`'s `AlternativeGenerator` produces span/girder-count/girder-depth combinations from a manually-typed `DesignSpace` (min/max span, not candidate abutment/pier positions). This is exactly today's "manually predefined bridge length" pattern section 5 of the new prompt asks to move away from. |
| Geotechnical | **MISSING** - no `Borehole`/soil-layer concept anywhere. |
| Hydraulic/seismic/meteorological | **MISSING**, though `EurocodeConcrete` (P06) shows the project already has one real precedent for "cite the code, don't invent the formula" applied to material properties - the same discipline extends naturally to these. |
| Analysis | **EXISTS for one structural alternative** - `analysis-api`/`midas-adapter` (P06) run a hand-built `AnalysisRequest` through MIDAS Civil NX and get real reactions/displacements back, verified live twice (a synthetic beam, then the real VIA-35 project). This is downstream of everything the new prompt asks for (it analyzes a structure that already has a location and a span arrangement) - it does not decide where the bridge goes. |
| Optimization | **MISSING** - `services/optimization-service` is an empty placeholder folder (deferred since P00, per spec sections 16/17). No Pareto/multi-objective code anywhere yet. |
| 3D visualization | **MISSING** - P05's `ElevationPreview` is a flat 2D schematic SVG side-view of one alternative, explicitly "not photorealistic 3D" per the spec's own instruction. No terrain, no plan view, no map. |
| Frontend information architecture | **EXISTS, but shallow** - P10 built a real shell (`Sidebar`/`TopBar`/content area) with a **flat** 12-item navigation (`frontend/src/sections.ts`). The new prompt's proposal is a **grouped**, ~9-category, ~70-leaf hierarchy - a materially different information architecture, not an extension of the current flat list. |
| Multi-bridge / corridor | **MISSING** - the entire system today models exactly one bridge at a time (one `Bridge`, one `DesignSpace`, one form). No `Project`-contains-`N`-`Bridges` concept exists in code (bridge-core's `Project` class holds one bridge's generated alternatives, not a bridge collection). |
| External data / provenance | **MISSING** - no external-data-provider abstraction, no RAW/APPROVED status model anywhere. |

**Bottom line**: everything built so far (P00-P06, P10) is real,
verified, working structural-alternative generation and MIDAS analysis
for **one bridge whose location and span arrangement the engineer types
in by hand**. The new prompt asks for everything **upstream** of that -
nothing built so far needs to be discarded; it becomes the "Structural
Alternative" and "Analysis" layers at the bottom of a much taller stack.

---

## B. Gap analysis

| Requirement (prompt section) | Status |
|---|---|
| Corridor/Site domain (§2) | MISSING |
| Alignment model (§3) | MISSING |
| 3D Terrain model + elevation queries (§4) | MISSING |
| Bridge length as design variable (§5) | MISSING - today it's a required scalar input |
| Abutment placement engine (§6) | MISSING |
| Pier placement engine (§7) | MISSING |
| 3D constraint/exclusion model (§8-9) | MISSING |
| Hydraulic/river crossings (§10) | MISSING |
| Geotechnical spatial model (§11) | MISSING |
| Automatic foundation level (§12) | MISSING - `Foundation` exists in `bridge-core` (P01) but is a flat type+pile-count/diameter record with no elevation derivation, per P01's own documented gap ("spread-footing dimensions not modelled... ask the engineer") |
| Bridge Layout Engine (§13-14) | MISSING |
| Span arrangement generator (§15) | **PARTIAL** - `generative-engine`'s combinatorial enumeration is a real precedent for *how* to enumerate span counts within a range, but it has no obstacle/constraint awareness and no notion of candidate C1/C2 |
| Layout vs. structural optimization split (§16) | MISSING (optimization itself doesn't exist yet at all - P09) |
| Project/corridor optimization (§17) | MISSING |
| Site Intelligence / external data (§18-23) | MISSING |
| Fast solver / OpenSees / MIDAS separation (§24-25) | **PARTIAL** - the `AnalysisEngine` port (P06) already exists and already proves the pattern works (MIDAS is the only implementation so far, but the interface has no MIDAS-specific method, and `EurocodeConcrete`/domain types in `analysis-api` are solver-independent) - adding `SpanovaFastSolver`/`OpenSeesAdapter` later is additive, not a redesign |
| Frontend navigation (§26) | **NEEDS REFACTOR** - see K below |
| Bridge Site screen (§27-29) | MISSING - closest existing analog is `ProjectPanel.tsx`, which is a static fact sheet with zero map/spatial content |
| Layout Generator / Alternatives screens (§30-31) | MISSING (existing `GenerateWorkflow` table is structural-alternative-only, not layout-alternative) |
| Visual workflow indicator (§32) | **PARTIAL** - `TopBar`'s 7-step tabs are a precedent for a workflow indicator, but map to the old Project/Geometry/Design Space/Generate/Analyze/Optimize/Results sequence, not the new SITE->LAYOUT->STRUCTURE->... sequence |
| Bridge inventory/corridor view (§33) | MISSING |
| Automatic site data acquisition (§34) | MISSING, and per the prompt's own instruction ("do not implement live external services before reviewing API availability, licensing, data quality") this stays a designed-but-deferred capability for longer than most other items here |
| AI role (§35) | MISSING - `services/ai-service` is an empty placeholder (deferred since P00, unchanged) |
| Engineering dependency graph (§36) | MISSING |
| Module/domain boundaries (§37) | See C/D below - existing `bridge-core`/`rules-engine`/`generative-engine`/`analysis-api`/`midas-adapter` boundaries are sound and should be preserved, extended by new modules alongside them |
| Data model distinction: raw/approved/site/layout/structural/reduced/result/optimization/final (§38) | MISSING as named types, though the project already has *some* precedent for keeping presentation DTOs separate from domain types (`AlternativeRow` in `backend/api` vs. `BridgeAlternative` in `bridge-core`) |
| Traceability (§39) | MISSING |

---

## C. Updated domain model

Following the existing codebase's own conventions exactly: Java 21
records for immutable value types, `bridge-core`-style field naming
(`xM`/`xDegrees`/explicit units), sealed interfaces where a closed set of
variants exists (the precedent is P06's `AnalysisSection`), nothing
solver-specific leaking into domain types (the precedent is
`analysis-api` having zero MIDAS references).

```java
// ---- spatial-core (new module, no dependencies) ----

/** A single coordinate reference system - identifies units/datum, nothing more at this stage. */
public record CoordinateSystem(String epsgCode, String name) { }

/** A 3D point in a named CoordinateSystem. */
public record Point3D(double x, double y, double z) { }

/** A position expressed as alignment-relative chainage + offset + elevation, NOT yet resolved to XYZ. */
public record ChainagePosition(double chainageM, double offsetM, double elevationM) { }


// ---- alignment (depends on spatial-core) ----

public record HorizontalAlignment(List<HorizontalElement> elements) { }
public sealed interface HorizontalElement permits StraightElement, CircularArcElement, TransitionCurveElement { }
public record StraightElement(Point3D start, Point3D end) implements HorizontalElement { }
public record CircularArcElement(Point3D center, double radiusM, double startAngleDeg, double sweepAngleDeg) implements HorizontalElement { }
public record TransitionCurveElement(/* clothoid params - needs engineer's own alignment-design convention before filling in */) implements HorizontalElement { }

public record VerticalAlignment(List<VerticalCurveElement> elements) { }
public record VerticalCurveElement(double startChainageM, double startElevationM, double gradePercent, double curveLengthM /* 0 = no vertical curve */) { }

/** The one type everything else in this document depends on: converts chainage/offset <-> real XYZ. */
public final class Alignment {
    // wraps HorizontalAlignment + VerticalAlignment;
    // toXYZ(ChainagePosition): Point3D
    // toChainage(Point3D): ChainagePosition (nearest-point projection)
}


// ---- terrain (depends on spatial-core) ----

/** Solver/format-independent - LandXML/DEM/TIN import each produce this, never referenced by name elsewhere. */
public interface TerrainModel {
    double elevationAt(double x, double y);
    default double elevationAt(Alignment alignment, double chainageM, double offsetM) {
        Point3D p = alignment.toXYZ(new ChainagePosition(chainageM, offsetM, 0));
        return elevationAt(p.x(), p.y());
    }
}


// ---- constraints (depends on spatial-core) ----

public enum ConstraintSeverity { HARD, SOFT, PREFERENCE }
public enum ConstraintType { ROAD, RAILWAY, RIVER, MAIN_RIVER_CHANNEL, JUNCTION, RAMP, BUILDING,
        UTILITY, FLOOD_ZONE, LANDSLIDE_ZONE, PROTECTED_AREA, TUNNEL, CONSTRUCTION_ACCESS, USER_DEFINED }

/** A 3D spatial volume, not a 2D line - matches prompt section 8-9's explicit requirement. */
public record ConstraintObject(
        String id, ConstraintType type, ConstraintSeverity severity,
        Geometry3D geometry, double verticalRangeMinM, double verticalRangeMaxM,
        double horizontalClearanceM, double verticalClearanceM, double foundationClearanceM,
        String source, String ruleReference) { }

/** Purely geometric - built on JTS (see section E) rather than re-invented. */
public interface Geometry3D {
    boolean intersects(Point3D point, double toleranceM);
    boolean intersects(ConstraintObject other);
}

public record NoPierZone(ConstraintObject constraint) { }
public record NoFoundationZone(ConstraintObject constraint) { }


// ---- geotechnical (depends on spatial-core) ----

public record SoilLayer(double topElevationM, double bottomElevationM, String description,
        Map<String, Double> engineeringParameters /* named, sourced params only - never invented defaults */) { }

public record Borehole(String id, double x, double y, double chainageM,
        double groundElevationM, List<SoilLayer> soilLayers, Double groundwaterElevationM) { }

/** Interpolation strategy is a PORT - no method is chosen/invented here, per prompt section 11's explicit warning. */
public interface GeotechnicalModel {
    List<Borehole> boreholes();
    /** @throws UnsupportedOperationException until the engineer approves a specific interpolation method */
    SoilProfile profileAt(double x, double y);
}
public record SoilProfile(double x, double y, List<SoilLayer> interpolatedLayers, String interpolationMethod, String warning) { }


// ---- hydraulic (depends on spatial-core, constraints) ----

public record RiverModel(String name, List<Point3D> centerline, List<Point3D> leftBank, List<Point3D> rightBank,
        double designFloodLevelM, double flowDirectionDeg) { }
/** Produces ConstraintObjects - never itself a constraint. */
public interface HydraulicConstraintGenerator {
    List<ConstraintObject> generate(RiverModel river);
}


// ---- seismic / meteorological (depends on spatial-core; site-intelligence for the raw fetch) ----

public record SeismicHazardData(double pgaG, String returnPeriod, String source, ExternalDataStatus status) { }
public record MeteorologicalData(double minTemperatureC, double maxTemperatureC, double windSpeedMPerS,
        String source, ExternalDataStatus status) { }
/** The raw-hazard -> design-parameter step is DELIBERATELY separate (prompt section 20's own distinction). */
public interface SeismicParameterEngine {
    /** @throws IllegalStateException if site-response data (Vs30/site class) has not been approved yet */
    DesignSeismicParameters deriveDesignParameters(SeismicHazardData hazard, SiteResponseData siteResponse, String designCode);
}


// ---- corridor (depends on all of the above + bridge-core) ----

public record Corridor(String id, String name, CoordinateSystem coordinateSystem, Alignment alignment,
        TerrainModel terrain, GeotechnicalModel geotechnical, RiverModel hydraulic /* 0..n, simplified here */,
        SeismicHazardData seismic, MeteorologicalData meteorological,
        List<ConstraintObject> constraints, List<BridgeSite> bridgeSites) { }

public record BridgeSite(String id, String name, double startChainageM, double endChainageM,
        String crossingType /* "River" | "Highway" | ... - free text per the same P01 discipline used for Pier.pierType */) { }


// ---- bridge-layout (depends on corridor, constraints, geotechnical, hydraulic, bridge-core, rules-engine) ----

public record AbutmentCandidate(double chainageM, Point3D coordinates, double terrainElevationM,
        double deckElevationM, double abutmentHeightM, double approachFillHeightM,
        Double preliminaryFoundationLevelM, FeasibilityStatus feasibility, List<String> rejectionReasons) { }

public record PierCandidate(double chainageM, Point3D coordinates, double terrainElevationM,
        double pierHeightM, Double preliminaryFoundationLevelM,
        FeasibilityStatus feasibility, List<String> rejectionReasons, List<String> warnings) { }

public record FoundationCandidate(String type /* "SPREAD" | "PILE" | "DRILLED_SHAFT" - matches bridge-core's existing FoundationType pattern */,
        double topElevationM, double bottomElevationM, Double pileLengthM, Double rockSocketM,
        FeasibilityStatus feasibility, List<String> warnings) { }

public enum FeasibilityStatus { FEASIBLE, WARNING, REJECT }

public record LayoutDesignSpace(List<String> allowedSuperstructureFamilyIds, List<PierShapeOption> allowedPierShapes,
        List<ConstraintPreference> preferences /* "avoid road", "prefer standard spans", ... - HARD/SOFT per constraint, not hard-coded */) { }

public record BridgeLayoutAlternative(String id, AbutmentCandidate c1, AbutmentCandidate c2,
        List<PierCandidate> piers, List<Double> spanLengthsM, String superstructureFamilyId,
        List<FoundationCandidate> preliminaryFoundations, double bridgeLengthM,
        List<ConstraintCheckResult> constraintResults, EarthworkMetrics earthworkMetrics,
        PreliminaryQuantities preliminaryQuantities, Double preliminaryCost, Double preliminaryCarbon,
        ConstructabilityMetrics constructabilityMetrics, FeasibilityStatus feasibilityStatus) { }

public record ConstraintCheckResult(String constraintId, boolean violated, String detail) { }


// ---- structural (existing bridge-core stays exactly as-is; new bridging type) ----

/** Converts an approved BridgeLayoutAlternative into bridge-core's existing BridgeAlternative generation scope - the seam between the new layer and everything already built. */
public interface StructuralAlternativeBuilder {
    com.spanova.bridgecore.DesignSpace toStructuralDesignSpace(BridgeLayoutAlternative layout, LayoutDesignSpace layoutSpace);
}


// ---- site-intelligence (depends on spatial-core only) ----

public enum ExternalDataStatus { RAW, PROCESSED, REVIEW_REQUIRED, APPROVED_FOR_DESIGN, REJECTED, SUPERSEDED }

public record DataProvenance(String source, String provider, java.time.Instant retrievedAt, String sourceDate,
        String version, String resolution, String coordinateSystem, String units,
        String processingMethod, ExternalDataStatus status, String approvedBy, java.time.Instant approvedAt) { }

public interface ExternalDataProvider<T> {
    T fetch(double x, double y);
    DataProvenance provenance();
}
```

Notes on what's deliberately **not** filled in above (per the "never
invent" rule, extended to geometry/GIS the same way it already applies
to structural formulas):
- `TransitionCurveElement`'s clothoid parameters - alignment-design
  convention needs the engineer's confirmation before choosing a
  parameterization.
- `GeotechnicalModel.profileAt`'s interpolation method - prompt section
  11 explicitly forbids inventing this.
- `SeismicParameterEngine`'s actual formula - prompt section 20
  explicitly requires this to come from an approved design code, not be
  derived generically.

---

## D. Bridge Layout Engine architecture

```
BridgeLayoutEngine
├── AbutmentPlacementEngine    (BridgeSite + Alignment + TerrainModel + AbutmentPlacementRule[]) -> AbutmentCandidate[]
├── PierPlacementEngine        (span-range candidates + constraints + terrain + geotechnical) -> PierCandidate[]
├── SpanArrangementGenerator   (C1/C2 candidates + pier candidates + LayoutDesignSpace) -> span-length combinations
│                              (this is generative-engine's existing combinatorial-enumeration PATTERN, reused -
│                               not the same code, since it now must respect obstacle positions, not just a min/max range)
├── ConstraintEvaluator        (candidate position + Corridor.constraints) -> ConstraintCheckResult[]
├── TerrainEvaluator           thin wrapper over TerrainModel for layout-specific queries (fill height, cut/fill)
├── GeotechnicalEvaluator      (PierCandidate + GeotechnicalModel) -> preliminary foundation feasibility
├── HydraulicEvaluator         (PierCandidate + RiverModel-derived ConstraintObjects) -> feasibility/penalty
├── PreliminaryFoundationEngine  (candidate + terrain + geotechnical + hydraulic) -> FoundationCandidate
├── PreliminaryQuantityEstimator  rough concrete/steel/earthwork volumes for SCORING only, not final design
└── LayoutScoringEngine        combines the above into BridgeLayoutAlternative.feasibilityStatus + metrics
```

Input: `BridgeSite` + `Corridor` (for terrain/geotechnical/hydraulic/
constraints) + a project-level `LayoutDesignSpace` + approved
`AbutmentPlacementRule`/pier placement rules (rule content supplied by
the engineer, same discipline as `rules-engine`'s `EngineeringRule`).

Output: `List<BridgeLayoutAlternative>`.

This sits as a **new module**, upstream of `generative-engine`:
`generative-engine` keeps its existing job (structural alternative
generation for ONE already-located, already-spanned bridge) - it becomes
a consumer of `StructuralAlternativeBuilder`'s output, not something
`bridge-layout` replaces.

---

## E. Spatial architecture

**Coordinate systems**: a `CoordinateSystem` value (EPSG code + name) is
carried on `Corridor`. Actual coordinate *transformation* (e.g.
WGS84 <-> a national projected CRS) is a real, well-solved problem - do
not hand-roll it. **Proj4J** (a Java port of PROJ) is the standard choice
here; needs its own license/maintenance check before adoption (not done
in this pass - flagging per the prompt's own instruction, this is a
second-priority verification once JTS below is confirmed as the
geometry foundation).

**Chainage <-> XYZ**: `Alignment.toXYZ`/`toChainage` as sketched in C
above - nearest-point projection onto a piecewise horizontal alignment,
elevation from the vertical alignment at that chainage. This is the
single most-used spatial operation in the whole system (every
`ChainagePosition` anywhere ultimately resolves through this) - gets its
own focused unit-test suite against hand-verified reference points
before anything else in `bridge-layout` is built on top of it.

**Terrain queries**: `TerrainModel.elevationAt(x, y)` as an interface,
backed initially by a simple triangulated surface (TIN) - a real,
bounded, unit-testable first implementation, with LandXML/DEM/point-cloud
*importers* added later as separate, swappable adapters (same
port/adapter shape as `AnalysisEngine`/`midas-adapter`).

**Spatial intersections / 3D exclusion zones**: **JTS Topology Suite**
(verified live 2026-09-10: EPL 2.0/EDL 1.0 - permissive, LocationTech/
Eclipse Foundation project, actively maintained with issues through
August 2026) for 2D geometric operations (buffers, intersections,
containment) - the standard, mature choice for this in Java, not a
niche pick. **3D** exclusion (the prompt's own "No-Pier VOLUME" concept,
section 9) needs an explicit vertical-range check *on top of* JTS's 2D
intersection, since JTS itself is 2D/2.5D - `ConstraintObject`'s
`verticalRangeMinM`/`verticalRangeMaxM` fields exist precisely for this,
checked as a simple range comparison alongside the JTS 2D test, not
inside JTS itself.

**Geometric tolerances**: every spatial comparison (constraint
intersection, chainage snapping, candidate deduplication) needs an
explicit tolerance value - **engineering-significant** (e.g. "is this
pier candidate inside the no-pier zone") tolerances must come from the
engineer (matching the "never invent a limit" rule extended to geometry);
purely computational tolerances (floating-point snapping) can be a
documented, non-engineering constant the same way
`DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M` already is.

**Spatial indexing**: JTS ships an STRtree (R-tree) - sufficient for
corridor-scale data (thousands of constraint objects, not millions);
revisit only if a real corridor turns out to need more.

---

## F. 3D frontend architecture

Current stack: plain React + inline styles/CSS classes, `lucide-react`
icons, no 3D/mapping library of any kind. **Not sufficient** for
sections 22/27/29's map + 3D terrain + layer control requirements - this
is a real, material new frontend capability, not a styling exercise like
P10's shell work.

Two genuinely separate needs, likely two different libraries:

1. **2D map with layers** (satellite imagery, alignment, existing roads/
   rail/river, flood zone, no-pier zones, boreholes) - a standard
   web-mapping library. **MapLibre GL JS** (open-source, BSD-3, active
   fork of the pre-license-change Mapbox GL JS) is the natural fit for
   layer-toggle UIs like the mockup's "Map Layers" panel - needs its own
   license/maintenance re-check at adoption time, same caveat as JTS/
   Proj4J above.
2. **3D terrain + bridge geometry** (the prompt's section 27 "interactive
   3D site" and section 31's "3D Views" thumbnails) - **Three.js** (via
   `@react-three/fiber` for idiomatic React integration) is the standard
   choice for this in a React app; a genuinely large addition, not a
   quick wrapper.

Both would be **new npm dependencies** - unlike `lucide-react` (a small,
purely decorative icon set), these are substantial libraries that shape
real application architecture (a map/3D canvas is not just another
component). Per the existing "don't add a dependency ahead of the
milestone that needs it" rule: **do not add either library until the
first milestone that actually renders a map or 3D scene is approved** -
recommending them here for planning purposes only.

The terrain profile chart (prompt section 29, and already visible in the
shared mockup as "Terrain Profile & Bridge Elevation") is a simpler 2D
line chart - reuse the same "plain SVG, no chart library" approach P05's
`ElevationPreview` already established, until/unless a real need for
interactivity (zoom, hover tooltips across a real dataset) justifies a
charting library.

---

## G. Layout generation algorithm strategy (design only, not implemented)

1. **C1/C2 candidate generation**: walk the alignment's chainage range
   in a configurable step (a computational tolerance, not an engineering
   quantity), evaluate `AbutmentPlacementEngine` at each station
   (terrain elevation, deck elevation from the vertical alignment,
   resulting abutment height against the engineer's approved max/min
   height rule), keep FEASIBLE stations, then collapse contiguous
   FEASIBLE runs into `AbutmentCandidateRegion`s rather than thousands of
   near-duplicate single points.
2. **Pier candidate generation**: for each (C1-region, C2-region) pair,
   walk feasible span-length combinations (reusing
   `generative-engine`'s existing combinatorial approach, extended to
   also consider non-uniform arrangements when standard spans are
   involved), compute implied pier chainages, evaluate each against
   `ConstraintEvaluator` (3D exclusion volumes) and
   `GeotechnicalEvaluator`/`HydraulicEvaluator` - reject/warn/penalize
   per prompt section 7's own worked example.
3. **Span arrangement generation**: combine surviving pier candidates
   into full C1->...->C2 arrangements, scored by
   `PreliminaryQuantityEstimator` + `LayoutScoringEngine`.
4. **Constraint filtering**: happens continuously during generation
   (reject early), not as a single post-filter pass - this is the only
   way to keep the combinatorial space tractable once real obstacles are
   involved (see J below).
5. **Preliminary foundation evaluation**: `PreliminaryFoundationEngine`
   runs only on candidates that already passed constraint filtering -
   expensive relative to a pure geometry check, so it should not run on
   rejected candidates.
6. **Layout scoring / Pareto filtering**: multi-objective from the start
   (cost/CO2/constructability/earthwork, per prompt section 16-17) -
   `LayoutScoringEngine` produces the metrics, a **separate**
   Pareto-filtering step (shared code with the later
   structural/corridor optimizers, not three copies of Pareto logic)
   reduces the alternative set for presentation.

This is the same shape `AlternativeGenerator` already uses today
(enumerate -> filter -> score), scaled up with real spatial constraints
- confirms the existing pattern generalizes rather than needing to be
reinvented.

---

## H. Site Intelligence architecture

`ExternalDataProvider<T>` (sketched in C) is the port; concrete
providers (`SatelliteProvider`, `TerrainProvider`, `SeismicProvider`,
`WeatherProvider`, `HydrologyProvider`, `GISProvider`) are adapters -
same pattern as `AnalysisEngine`/`midas-adapter`. Every provider call
returns data tagged `RAW`; a review step (a person, not code) promotes
it to `APPROVED_FOR_DESIGN`, recorded via `DataProvenance`. **No
concrete provider gets implemented until the engineer names a specific
service** (API availability/licensing/data quality per the prompt's own
instruction) - this stays a pure interface + provenance model for now.

---

## I. Corridor workflow (~50 bridges, no duplication)

`Corridor` (C above) holds the shared site data (one `Alignment`, one
`TerrainModel`, one `GeotechnicalModel`, etc.) **once**; each
`BridgeSite` is a lightweight reference into a chainage range of that
shared corridor, not a copy. `BridgeLayoutEngine` runs once per
`BridgeSite` but reads the *same* `Corridor` object each time - the
corridor-scale data (terrain, geotechnical, constraints) is loaded/
queried once per session, not once per bridge. This mirrors the
`Project`-holds-`Bridges` shape the prompt itself describes in section
17's diagram.

---

## J. Performance (generating thousands of layout alternatives)

- **Reject early, reject cheap**: geometry/constraint checks (JTS
  intersection, a range comparison) run before anything that touches
  geotechnical interpolation or foundation sizing - the expensive checks
  only see candidates that already survived the cheap ones (same
  ordering already used conceptually in G above).
- **Spatial indexing** (STRtree, per E) turns "does this candidate hit
  any of N constraints" from O(N) into close to O(log N) per candidate.
- **Bound the search space explicitly**: chainage step size and span
  combination limits are configuration, not accidents - the same
  `DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M`-style documented constant
  pattern already used in `generative-engine`.
- **Stream, don't materialize**: candidate generation as a lazy
  stream/iterator (Java `Stream`) rather than building a full list
  before filtering - avoids holding thousands of rejected candidates in
  memory.
- Defer real profiling/tuning until `LAYOUT-P01` (M below) produces a
  first working, measurable pipeline - premature optimization here would
  itself violate the project's own "don't build ahead of the milestone
  that needs it" discipline.

---

## K. Frontend menu (proposed)

The prompt's section 26 proposal (9 top-level groups, collapsible,
~70 leaf items) is **materially different** from P10's current flat
12-item `sections.ts` list - this needs a genuine navigation-model
refactor, not an incremental addition:

- `SectionId` (flat union) -> a **two-level** model: `NavGroup` (id,
  label, collapsible) containing `NavItem[]`, matching the mockup's
  "Project ▾ / Site & Corridor ▾ / Design System ▾ / Bridges / Analysis
  / Optimization / 3D & Visualization / Reports" grouping exactly.
- Every leaf keeps the same "only real sections get real components,
  everything else is an honest named placeholder" discipline P10 already
  established (`PlaceholderPanel` pattern) - a ~70-item menu makes this
  MORE important, not less, since most leaves won't have real
  functionality for a long time.
- The **AI Assistant** group (prompt's item 9) stays a placeholder
  indefinitely - `services/ai-service` remains an empty folder (spec
  section 17, unchanged - "add natural-language interaction only after
  deterministic functionality is validated").
- Recommend NOT building all ~70 leaves' placeholders in one pass -
  scaffold the group/collapse structure first (a real, reviewable UI
  change), add leaf placeholders incrementally as each area's real
  milestone approaches, matching how P10 added `ProjectPanel` one
  concrete screen at a time rather than all placeholders at once.

---

## L. Development roadmap (dependency order)

Everything here is **new scope**, additive to the existing P00-P12
numbering (same pattern as how P06/MIDAS work got its own
sub-milestones). Proposed order, each gated the same way as every prior
milestone (explain -> assumptions -> ask -> approved scope only -> stop):

1. **`spatial-core` + `Alignment`** (chainage<->XYZ, unit-tested against
   hand-verified points) - nothing else can be built without this being
   correct first.
2. **`TerrainModel`** (simple TIN, `elevationAt` queries) - the second
   most-depended-on primitive.
3. **`ConstraintObject`/`constraints` module** (no UI yet) - geometry +
   JTS integration, unit-tested against synthetic constraint shapes.
4. **`BridgeSite`/`Corridor` domain** (no generation logic yet) - just
   the aggregate + a way to construct one by hand (mirrors how
   `bridge-core`'s P01 built the domain model before P03 generated
   anything).
5. **`AbutmentPlacementEngine`** (single-obstacle-free case first).
6. **`PierPlacementEngine` + `ConstraintEvaluator`** (introduce real
   obstacles).
7. **`SpanArrangementGenerator` + `LayoutScoringEngine`** ->
   `BridgeLayoutAlternative[]` - this is the actual "LAYOUT-P01" target
   (see M).
8. **Frontend**: 2D map (MapLibre) rendering the corridor + constraints +
   generated layout alternatives - the first real visual proof.
9. **`StructuralAlternativeBuilder`** - the seam connecting a selected
   `BridgeLayoutAlternative` into the *existing* `generative-engine`/
   `rules-engine`/`analysis-api` chain, now targeting the native
   `spanova-analysis-engine` (see addendum P) instead of `midas-adapter`.
10. Geotechnical/hydraulic/seismic spatial models, foundation-level
    derivation - layered in once layout generation itself is proven.
11. Site Intelligence providers - only once a specific external service
    is named and reviewed.
12. Corridor-scale UI (bridge inventory, corridor map) - once more than
    one `BridgeSite` actually exists to inventory.
13. 3D visualization (Three.js) - after the 2D map is solid; a
    genuinely separate, larger effort.
14. Layout/structural/corridor optimization (three distinct levels, per
    prompt section 16-17) - after (7) and (9) both produce real,
    scoreable alternatives to optimize over.

Structural optimization (§16.B) specifically **requires** (7) and (9) to
exist first - you cannot optimize the structural design of a layout that
doesn't exist yet, which is exactly the ordering the prompt itself
insists on (non-negotiable principle 1).

---

## M. First milestone recommendation

The prompt's own suggested `LAYOUT-P01` (one alignment + one simple
terrain + one bridge site + one obstacle + candidate C1/C2 + candidate
piers + several feasible span arrangements + 3D visualization + terrain
profile, no FEM) is well-scoped **except** for bundling "3D
visualization" into the very first milestone - per F above, 3D
(Three.js) is a materially larger, separate effort from 2D mapping. Two
adjustments:

1. Split "visualization" out: **LAYOUT-P01's own success criterion**
   should be the layout engine producing correct, constraint-respecting
   `BridgeLayoutAlternative`s - provable via a plain data table (the
   same "prove it with a table first" discipline P03 already used for
   structural alternatives) plus the 2D terrain-profile chart (already
   proven cheap in P05's style, no new library). Push the map (MapLibre)
   to an immediately-following milestone, and Three.js further out
   still.
2. Keep the obstacle genuinely simple - one `NoPierZone` from one
   `ConstraintObject`, not the full `ConstraintType` enum - matching how
   P04 shipped Rules Engine infrastructure with zero real rules rather
   than trying to model every rule type at once.

Revised **LAYOUT-P01** (superseded further by addendum Q below - terrain
now deferred entirely): one hand-built straight-line `Alignment`, one
`BridgeSite`, one `NoPierZone`, an approved span range -> candidate
C1/C2 (as a feasible region, not just one point) + candidate piers +
several feasible `BridgeLayoutAlternative`s shown in a table. No FEM, no
map, no 3D, no geotechnical/hydraulic, no terrain yet.

---

## N. Validation plan

Same standard already applied throughout this project (EN1992-1-1
Table 3.1 cross-checked against a published source; MIDAS results
verified against independent hand calculation): a `LAYOUT-P01` run
against a **hand-worked reference case** the engineer designs by hand
first (a simple alignment, one obstacle, one span range, manually
determined feasible C1/C2 and pier positions) - the engine's output must
match the engineer's own manual layout within an agreed tolerance,
verified with an automated test using the engineer's real reference
numbers as fixtures (the same pattern `MidasResultExtractorTest` already
established: real captured values as test data, not synthetic ones).

---

## O. Risks

| Risk | Notes |
|---|---|
| Geometry/coordinate-system risk | A single sign or axis-order error in `Alignment.toXYZ` silently corrupts every downstream candidate - mitigated by N's dedicated hand-verified test suite before anything else is built on it |
| Terrain-data risk | Real DTM/LandXML data has real import quirks (gaps, wrong CRS, resolution) - the `TerrainModel` interface isolates this, but real-data testing is a separate, later effort from the synthetic-TIN first milestone |
| GIS/library-license risk | JTS is confirmed clear (EPL/EDL); MapLibre and Proj4J are NOT yet verified in this pass - do that before either is actually added as a dependency |
| External-data reliability risk | No provider is chosen yet by design (H) - defer until a specific service is named and its SLA/accuracy is understood |
| Engineering-rule risk | Every placement rule (abutment height limits, span-length preferences, etc.) needs the same "ask, never invent" discipline already enforced project-wide - the sheer number of new rule *types* this domain introduces (compared to today's single `EngineeringRule` interface with zero real rules) means this will come up often and repeatedly |
| Geotechnical/hydraulic risk | Both are explicitly flagged in the prompt itself as needing approved methods (interpolation, scour) - same discipline, more surface area |
| Optimization risk | Combinatorial explosion once layout x structural x corridor optimization all exist - J's performance strategy needs real validation at scale, not just design-time reasoning |
| UI/3D performance risk | A real corridor (50 bridges, real terrain, real GIS layers) in a browser is a genuine rendering-performance problem - not assessable until F's libraries are actually integrated |
| Module-count/architecture risk | Section 37's ~23-module list is more granularity than the codebase currently has appetite for (compare: today's entire backend is 6 modules) - C/D above propose consolidating into ~8 new modules; revisit only if a real need for finer splitting appears, per the project's own standing "don't scaffold ahead of need" rule |
| Scope-creep risk (self-assessment) | This document itself is large - the biggest practical risk is trying to build too much of it at once. L's dependency-ordered milestone list exists specifically to keep this from happening. |

---

## Non-negotiable principles (prompt section 41) - acknowledged, not restated

All 25 are consistent with rules already in force in this project
(`CLAUDE.md`'s "never invent," milestone gating, solver independence) -
extended to a new domain (site/geometry/geotechnical/hydraulic) rather
than introducing new kinds of rules. No conflicts found with anything
already built.

---

---

## P. Addendum (2026-09-10): MIDAS out, native SPANOVA analysis engine in

**Engineer's instruction, verbatim intent:** SPANOVA will no longer use
MIDAS Civil NX for analysis. SPANOVA gets its **own** analysis engine.
Bridge models are simplified for speed: superstructure and piers as
**1D frame elements**, bearings as **elastic-link elements** (same
Kx/Ky/Kz-supplied-externally approach already agreed for P07), and
foundations as **spring coefficients** (stiffness values, not a full
soil model - consistent with the already-agreed "soil skipped, fixed-
base-or-spring, no geotechnical FEM" P07 scope). Goal: analysis fast
enough to run thousands of times inside the layout/structural
optimization loops (G, J above) - something a MIDAS WebSocket-relay
round trip per request cannot do.

**This is a direct, positive resolution of an open question this
document itself raised**: non-negotiable principle "SPANOVA independent
from MIDAS/OpenSees" (prompt section 41) and the `IAnalysisEngine`
FAST/INTERMEDIATE/FINAL hierarchy referenced in B above already
anticipated a `SpanovaFastSolver`. This instruction confirms that
solver is not just a fast pre-screening tier alongside MIDAS - it
**replaces** MIDAS as the analysis engine for the whole pipeline
(existing structural-alternative flow *and* the new layout engine).

**What this changes in this document:**
- **B (Gap analysis)** - "Analysis" row: the existing `analysis-api`/
  `midas-adapter` chain (P06, verified live twice) stays as **working,
  historically-verified reference code**, but is no longer the target
  for new development. A new port implementation,
  `spanova-analysis-engine` (module name pending), becomes the primary
  `AnalysisEngine` adapter.
- **D (Bridge Layout Engine)** - the layout engine's own scoring
  (`PreliminaryQuantityEstimator`/`LayoutScoringEngine`) was already
  planned as lightweight/geometric, not full FEM - unaffected. But once
  layout alternatives reach `StructuralAlternativeBuilder` (L, step 9),
  full analysis now runs through the native engine, not MIDAS.
- **L (Roadmap)** - step 9 updated above. The native engine itself
  becomes new roadmap scope, likely sequenced in parallel with or
  shortly after `spatial-core`/`Alignment` (step 1), since it has no
  dependency on the site/terrain work - it depends only on the existing
  `bridge-core` domain model and `analysis-api`'s existing port
  interface (`AnalysisEngine`, `AnalysisRequest`/`AnalysisResult`
  domain types from P06 - solver-independent by design, confirmed
  reusable here without modification).
- **Existing `midas-adapter` module**: **kept and stays in active use** -
  not retired, not just legacy reference code. Confirmed role (2026-09-10):
  once a bridge alternative is selected (post-optimization), that single
  design gets a detailed MIDAS NX run for final verification. It is
  never invoked during optimization/layout screening - that is entirely
  `spanova-analysis-engine`'s job. This is the FINAL tier of the
  FAST/INTERMEDIATE/FINAL `AnalysisEngine` hierarchy already anticipated
  in section B.

**Engineering questions - resolved 2026-09-10:**

1. **Analysis method**: linear-elastic only. No geometric or material
   nonlinearity. Confirmed - `spanova-analysis-engine` implements the
   classical linear direct stiffness method, nothing else, for now.
2. **Foundation springs**: **all 6 DOF** used (Kx, Ky, Kz, Krx, Kry,
   Krz) - not translational-only. Real per-site values will be entered
   as data later (geotechnical-derived, out of scope for now); until
   then, the engineer supplied fixed **placeholder** values to unblock
   development, source = engineer, 2026-09-10, units kN/m (Kx, Ky, Kz)
   and kN·m/rad (Krx, Kry, Krz), explicitly temporary, not to be
   mistaken for a design value:
   | DOF | Value | Unit |
   |---|---|---|
   | Kx | 2000 | kN/m |
   | Ky | 2000 | kN/m |
   | Kz | 100000 | kN/m |
   | Krx | 50000 | kN·m/rad |
   | Kry | 50000 | kN·m/rad |
   | Krz | 1000000 | kN·m/rad |
3. **Scope of replacement**: the native engine replaces MIDAS for
   **all** analysis during generation/optimization (layout screening
   *and* the structural-alternative flow, i.e. resumes P07's paused
   work on the native engine, not MIDAS). **MIDAS NX is kept**, not
   retired - but strictly as a **post-selection, high-fidelity
   verification tier**: once a bridge alternative is chosen, that one
   alternative gets a detailed MIDAS run. MIDAS is never invoked inside
   an optimization loop. This maps exactly onto the
   FAST/INTERMEDIATE/FINAL `AnalysisEngine` hierarchy this document
   already anticipated in section B: `spanova-analysis-engine` =
   FAST/primary, `midas-adapter` (P06, unchanged) = FINAL, invoked once
   per selected design, not per candidate. No `OpenSeesAdapter`
   (INTERMEDIATE) was requested - not in scope unless asked for later.
4. **Traffic load (LM1)**: still sourced from the **EN library**
   (EN1991-2 Table 4.2 tandem + UDL definition, not invented) - but
   applied in a **simplified** form suited to the 1D-frame model rather
   than MIDAS's full multi-lane vehicle simulation. The exact
   simplification method (e.g. enveloping equivalent line load vs.
   critical tandem placement via influence lines) is real new
   engineering scope and is **deferred to when LM1 implementation is
   actually reached** on the roadmap (native engine self-weight/dead
   load first, matching P07's original Checkpoint A/B ordering) -
   flagging now so it is not silently invented later either.
5. **Element formulation**: both Euler-Bernoulli and Timoshenko
   accepted by the engineer - left as a software/implementation choice,
   not an engineering one. Default: Euler-Bernoulli 2-node frame
   elements (6 DOF/node in 3D) as the simpler, standard baseline for the
   girder/pier proportions already used in this project (VIA-35: 1.90 m
   deep precast I-girders, span/depth ~20+ - well within slender-beam
   territory); revisit only if a specific case shows shear-deformation
   sensitivity.

**No code written for this addendum either.** All five scope questions
now resolved. Still waiting on the original three approval points
(module consolidation, revised LAYOUT-P01, first-implementation-step
go-ahead) before any implementation begins.

---

## Q. Addendum (2026-09-10): 3D terrain deactivated for now - pier/abutment heights entered externally

**Engineer's instruction, verbatim intent:** deactivate the 3D-terrain
part for now. Pier (column) heights are entered externally/manually for
now. Once real terrain data becomes available later, pier heights will
instead be **computed** inside the layout module (from terrain elevation
at each candidate chainage, per D/G's original design).

**Effect: this further simplifies M's already-revised LAYOUT-P01** -
`TerrainModel` is removed from the first milestone entirely, not just
deferred to a "simple flat/sloped" placeholder as M previously said.

- **C (domain model)**: `TerrainModel` interface stays as designed (it
  is still the right long-term shape) but has **no implementation and
  no caller** for now - not even the simple synthetic TIN L's roadmap
  step 2 proposed. Deferred until real terrain data is available.
- **D (Bridge Layout Engine)**: `AbutmentCandidate.terrainElevationM`
  and `PierCandidate.terrainElevationM` become **optional/nullable**
  for now - `AbutmentPlacementEngine`/`PierPlacementEngine` do not query
  a `TerrainModel`. Instead, `abutmentHeightM`/`pierHeightM` are taken
  as a **direct external input per candidate** (engineer-supplied,
  matching the exact pattern already used for the VIA-35 example - "p1
  10m, p2 12m" - just generalized to per-layout-candidate rather than a
  single fixed bridge).
- **G (algorithm strategy)**: step 1/2's terrain-elevation-driven height
  computation is **skipped** for now; candidate generation instead pairs
  each geometric position (chainage) with an engineer-supplied height
  value (or a small set of engineer-supplied height options to explore,
  if more than one is to be tried per position - open question, not
  decided here). `TerrainEvaluator` (D's module list) is not built yet.
- **L (roadmap)**: step 2 (`TerrainModel`) is **removed from the
  near-term sequence** - it moves to a "later, once terrain data exists"
  bucket alongside geotechnical/hydraulic (previously step 10). This
  also **removes one dependency** from the critical path: layout
  candidate generation (steps 4-7) no longer waits on terrain at all,
  only on `spatial-core`/`Alignment` (step 1) and
  `constraints`/`Corridor` (steps 3-4).
- **M (first milestone)**: revised again (see the strikethrough note
  added at M) - LAYOUT-P01 no longer includes any `TerrainModel`, flat
  or otherwise, and has no terrain-profile chart (that chart's entire
  input was terrain elevation - nothing to plot without it). Its
  remaining scope (one `Alignment`, one `BridgeSite`, one `NoPierZone`,
  externally-supplied heights, candidate generation -> a table of
  feasible `BridgeLayoutAlternative`s) becomes noticeably smaller and
  more clearly a "prove the combinatorial/constraint logic first" first
  milestone - arguably an even better fit for a true first milestone
  than the original LAYOUT-P01 candidate.
- **Future re-activation**: when terrain data does arrive, the swap is
  additive, not a rewrite - `AbutmentPlacementEngine`/
  `PierPlacementEngine` gain a `TerrainModel` dependency and start
  computing `terrainElevationM`/heights instead of reading them from
  external input, exactly the port/adapter shape already used everywhere
  else in this document (e.g. `midas-adapter` added onto `analysis-api`
  without changing the port).

**No code written for this addendum either.**

---

**Stopping here per instruction. No code written. Waiting for review/
approval of this analysis - in particular: (1) the proposed module
consolidation in C/D, (2) the now-twice-revised LAYOUT-P01 scope (3D
split out per M, terrain removed entirely per Q), (3) confirmation to
proceed with `spatial-core`/`Alignment` as the actual first
implementation step once approved, and (4) the analysis-engine decisions
in addendum P (all five questions resolved).**
