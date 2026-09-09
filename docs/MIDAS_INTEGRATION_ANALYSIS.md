# MIDAS Civil NX Integration Analysis (pre-P06/P07)

Status: **analysis only - no production code written yet.** This document
answers the 10 questions in the engineer's MIDAS integration prompt
(2026-09-09) before any MIDAS-specific implementation starts. Every
capability claim below is sourced from MIDAS's own official
documentation (checked live today, links inline) or explicitly marked
UNCERTAIN - nothing here is guessed.

Research method: `support.midasuser.com` blocks plain HTTP fetches
(403 - bot/Cloudflare protection), so it was read through a real browser
session instead. Primary sources used:

- [MIDAS API Online Manual (JSON Manual)](https://support.midasuser.com/hc/en-us/articles/33016922742937-MIDAS-API-Online-Manual) - edited 2026-07-14, full endpoint catalog
- [How to work MIDAS CIVIL NX Open API?](https://support.midasuser.com/hc/en-us/articles/30212837484441-How-to-work-MIDAS-CIVIL-NX-Open-API) - connection architecture
- [API Settings](https://support.midasuser.com/hc/en-us/articles/27745256204057-API-Settings) - how Base URL / MAPI-Key are obtained
- [Designing with Intent: The Vision Behind POST/TABLE](https://support.midasuser.com/hc/en-us/articles/45171987915929-Designing-with-Intent-The-Vision-Behind-POST-TABLE) - result-extraction JSON structure
- [MIDAS Civil NX Python library](https://github.com/MIDASIT-Co-Ltd/midas-civil-python) / [docs](https://midas-rnd.github.io/midasapi-python/) - official reference client, confirms concrete request shapes

## 1. Critical review of the proposed architecture

The engineer's proposed architecture (IAnalysisEngine port, MIDAS-specific
code isolated in an adapter, AnalysisRequest/AnalysisResult as
solver-independent domain objects, ModelMapping, staged
screening/basic/detailed/final analysis levels, job queue with a
configurable concurrency policy, model-family reuse, engineering QA after
MIDAS, bearing/foundation/global design iteration, failure handling,
reproducibility, caching) is sound and needs no structural correction.
It also matches what SPANOVA already scaffolded since P00:
`backend/analysis-api` (port) and `backend/midas-adapter` (adapter) exist
specifically for this.

Three things the research surfaced that the architecture should
explicitly account for (not corrections - additions, since MIDAS's real
mechanics turned out more specific than "an API" implies):

1. **The API is not local-only - it is a cloud relay.** Every request
   goes Client -> HTTPS -> MIDASIT's own AWS-hosted server -> WebSocket ->
   the engineer's running MIDAS Civil NX desktop process. ("The server
   \[AWS\] acts as an intermediary between MIDAS products and
   applications" - *How to work MIDAS CIVIL NX Open API?*.) Two
   consequences for the architecture:
   - **Data residency**: bridge geometry/loads leave the engineer's
     machine on every single call. Worth an explicit flag for
     confidentiality-sensitive projects - this document surfaces it,
     the engineer decides if it matters.
   - **"MIDAS Worker" in the AnalysisJobManager diagram is a real,
     running, GUI-open Civil NX desktop process**, not a spawned headless
     process. There is no evidence of a headless/server execution mode
     anywhere in the docs found. `SolverConcurrencyPolicy.maxConcurrentJobs`
     is therefore bounded by how many separately licensed Civil NX
     instances the engineer can have open and API-connected
     simultaneously - not by anything the API itself provides for free.
     This *confirms* the caution already written into section 9 of the
     engineer's own prompt; it's now a verified constraint, not a
     hypothetical one.
2. **Authentication is a `MAPI-Key` HTTP header**, generated inside Civil
   NX itself (Apps tab -> API group -> API Settings -> Connect), described
   as a *temporary, regenerable* token. `MidasApiClient` must treat it as
   external configuration (never hardcoded, never committed) and must
   tolerate it changing.
3. **Java naming**: the prompt's `IAnalysisEngine` follows C#/.NET
   convention (interface-prefix `I`). Existing SPANOVA Java code has no
   `I`-prefixed interfaces; proposing `AnalysisEngine` as the interface
   name below to match the codebase's own convention - purely cosmetic,
   flagging it rather than silently renaming without saying so.

## 2. Capability matrix

| Capability | Required by SPANOVA | Supported by MIDAS Civil NX Open API? | Source | Limitation / uncertainty | Strategy |
|---|---|---|---|---|---|
| New/open/close/save project | Yes | **Yes** - `/doc/NEW`, `/doc/OPEN`, `/doc/CLOSE`, `/doc/SAVE`, `/doc/SAVEAS` | JSON Manual | POST only, body under `"Argument"` key | `midas-adapter` lifecycle calls |
| Node creation | Yes | **Yes** - `/db/NODE` (POST/GET/PUT/DELETE) | JSON Manual; confirmed example: `PUT /db/NODE {"Assign":{"1":{"X":-1,"Y":-1,"Z":-1}}}` (Python lib docs) | - | Direct mapping from `SpanLayout`/`Girder` geometry |
| Element creation | Yes | **Yes** - `/db/ELEM` | JSON Manual | Large TYPE enum (beam/truss/plate/...) - only "beam" needed for MIDAS-P01 | - |
| Material properties | Yes | **Yes** - `/db/MATL` (+ time-dependent creep/shrinkage variants `TDMF`/`TDMT`/`TDME`) | JSON Manual | Time-dependent variants deferred to MIDAS-P07 | - |
| Section properties | Yes | **Yes** - `/db/SECT`, very large variant set (PSC, Composite-PSC, Steel Girder, Tapered, ...) | JSON Manual | Exact field schema for the PSC/Girder subtype not yet pulled (page exists, not yet read) | Read the specific `/db/SECT` PSC-variant detail page before MIDAS-P01 coding |
| Boundary conditions (supports) | Yes | **Yes** - `/db/CONS` (constraint support), `/db/NSPR` (point spring), `/db/GSPR` (general spring) | JSON Manual | - | `CONS` suffices for MIDAS-P01's "simple supports" |
| Bearings (elastic links) | Yes | **Yes** - `/db/ELNK` (Elastic Link), dedicated Kx/Ky/Kz-style stiffness object implied by name | JSON Manual (endpoint confirmed; field-level schema page not yet read) | UNCERTAIN exact field names | Read `/db/ELNK` detail page before MIDAS-P09 (bearing iteration) - not needed for P01 |
| Foundation springs (pile-group equivalent stiffness) | Yes | Endpoint exists (`/db/GSPR` general spring), but whether it models a full 6x6 pile-group-equivalent stiffness matrix is **UNCERTAIN** | JSON Manual (index only) | Not confirmed | Read `/db/GSPR` detail page before MIDAS-P10 - not needed for P01 |
| Self-weight / dead loads | Yes | **Yes** - `/db/BODF` (self-weight), `/db/CNLD` (nodal), `/db/BMLD` (beam) | JSON Manual | - | MIDAS-P01 scope |
| Traffic / moving loads | Yes | **Yes** - extensive: vehicle libraries per AASHTO/Eurocode/BS/Canada/etc. (`/db/MVHL`), traffic lanes (`/db/LLAN`/`SLAN`), moving load cases (`/db/MVLD`) | JSON Manual | Very large, code-specific | MIDAS-P05 scope, not P01 |
| Temperature loads | Not in P01 | **Yes** - `/db/ETMP`, `GTMP`, `BTMP`, `STMP`, `NTMP` | JSON Manual | - | Deferred |
| Seismic (response spectrum + time history) | Not in P01 | **Yes** - `/db/SPFC` (many national codes), `/db/SPLC`, full time-history endpoint family | JSON Manual | - | MIDAS-P08 scope |
| Construction stages | Not in P01 | **Yes** - `/db/STAG`, `CSCS`, `TMLD`, `CRPC` (creep), `STBK`, `CMCS` (camber) | JSON Manual | - | MIDAS-P06 scope |
| Prestressing / tendons | Not in P01 | **Yes** - `/db/TDNT`, `TDNA`, `TDPL`, `PRST`, `PTNS` | JSON Manual | - | MIDAS-P07 scope |
| Load combinations | Not in P01 | **Yes** - `/db/LCOM-GEN/CONC/STEEL/SRC/STLCOMP/SEISMIC`, design-code-specific | JSON Manual | - | MIDAS-P04 (MIDAS-numbering, not SPANOVA's own P04) |
| Run analysis | Yes | **Yes** - `POST /doc/ANAL`, empty body `{}` | JSON Manual + Python lib | Synchronous vs. async behavior, and how a long analysis's status is polled, **not yet confirmed** - the DOC section's own description doesn't say | Verify empirically in MIDAS-P01 (does the HTTP call block until done, or return immediately with a job token?) |
| Reactions | Yes | **Yes** - `POST /post/table` with `TABLE_TYPE` for Reaction-Local/Global/Surface Spring | JSON Manual + POST/TABLE guide (full JSON structure read: `TABLE_TYPE`, `NODE_ELEMS`, `UNIT`, `COMPONENTS`, `STYLES`, `EXPORT_PATH`) | Exact `TABLE_TYPE` string values (e.g. is it `"REACTIONG"`?) not yet cross-checked against the Reaction result-table detail page | Read that one detail page during MIDAS-P01 implementation |
| Displacements | Yes | **Yes** - `POST /post/table`, Displacement-Local/Global | Same as above | Same as above | Same as above |
| Beam forces/moments/stresses | Not required for P01's "simple beam" (self-weight reactions/displacements are enough to validate) | **Yes** - Beam Force / Beam Stress result tables | JSON Manual | - | MIDAS-P02+ |
| Elastic Link (bearing) results | Not in P01 | **Yes** - dedicated "Elastic Link - Analysis Result Table" | JSON Manual | - | MIDAS-P09 |
| Modal results | Not in P01 | **Yes** - "Vibration Mode Shape" table (Eigenvalue + Participation Vector) | JSON Manual | - | MIDAS-P08 |
| Model modification (update an existing open model in place, for "Model Family" reuse) | Yes (section 10 of the prompt) | **Plausible, not explicitly confirmed** - every `/db/*` endpoint supports GET/PUT/DELETE per numeric ID, which structurally allows updating e.g. one node's coordinates without rebuilding the model | Inferred from the DB endpoint's own CRUD pattern, not a documented recommended workflow | Genuinely uncertain | Test empirically in MIDAS-P02, only after MIDAS-P01's from-scratch round trip is proven - do not assume it works |
| Batch / headless execution | Wanted (section 8/9) | **No evidence of a headless/server mode.** The API requires Civil NX's own GUI application to be running and API-connected (Apps > API > API Settings > Connect) | *API Settings* article | Every "worker" is a real desktop process | `AnalysisJobManager`'s workers = real Civil NX instances, not spawned headless processes |
| Parallel execution | Wanted, cautiously (section 9) | **Structurally license-bound.** The relay server "can handle multiple WebSocket clients simultaneously," but each is a distinct connected product instance (one `MAPI-Key` = one running Civil NX) | *How to work...* article | Not unlimited; depends entirely on how many licensed, running Civil NX instances the engineer can operate | `maxConcurrentJobs` must default to **1** until the engineer confirms available licenses/machines - do not build multi-worker orchestration before that's known |
| Data residency (new finding, not in original prompt) | N/A | Every call is relayed through MIDASIT's own AWS infrastructure - not a purely local/offline mechanism | *How to work...* article: "the server (AWS) acts as an intermediary" | Confidentiality consideration for sensitive projects | Flagged for the engineer's awareness; not a software decision Claude can make |

## 3. Authentication / connection (concrete, verified)

- Open Civil NX -> **Apps tab -> API group -> API Settings**.
- The panel shows a **Base URL** and a **MAPI-Key** (a long token), and a
  Connect/Disconnect toggle plus "Connect API on Startup."
- The engineer must click **Connect**, then copy both values out.
- Every REST request must carry header `MAPI-Key: <token>`.
- The key is described as temporary/regenerable - `midas-adapter` must
  read it from external configuration (e.g. an environment variable or
  `application.properties` entry not committed to git), never hardcode
  it, and surface a clear error if the configured key is rejected (it may
  have been regenerated since).
- Confirmed request shape (official Python client):
  ```
  MidasAPI("PUT", "/db/NODE", {"Assign": {"1": {"X": -1, "Y": -1, "Z": -1}}})
  ```
  i.e. `METHOD https://<base-url>/db/NODE` with header `MAPI-Key: ...` and
  a JSON body whose outer key is `"Assign"` for POST/PUT.

**Blocking on the engineer**: MIDAS-P01 cannot make a single real API call
without the engineer's own Base URL + MAPI-Key from their own licensed
Civil NX installation. This is not something Claude can generate or
substitute a placeholder for.

## 4. Proposed Java package/module architecture

Fits the module boundaries already scaffolded since P00 - no new Maven
module needed.

```
backend/analysis-api/            (solver-independent port - existing module)
  com.spanova.analysis
    AnalysisEngine                 interface: submit/getStatus/getResults/cancel
    AnalysisRequest                record (see section 5)
    AnalysisResult                 record (see section 5)
    AnalysisJob, AnalysisJobId, AnalysisStatus (enum)
    AnalysisLevel                  enum: SCREENING, BASIC, DETAILED, FINAL

backend/midas-adapter/           (MIDAS-specific - existing module)
  com.spanova.midas
    MidasCivilNxAnalysisEngine     implements AnalysisEngine
    MidasApiClient                 raw HTTP: base URL + MAPI-Key header, call(method, path, body)
    MidasModelBuilder               AnalysisRequest -> sequence of /db/* calls
    MidasResultExtractor           /post/table calls -> raw result JSON
    MidasResultMapper              raw MIDAS result -> AnalysisResult, via ModelMapping
    ModelMapping                   SPANOVA id <-> MIDAS id table

backend/api/                     (orchestration - existing module, new package)
  com.spanova.api.analysis
    AnalysisJobManager, AnalysisQueue, SolverConcurrencyPolicy,
    AnalysisCache, AnalysisFingerprintService, EngineeringQaService,
    DesignIterationManager
```

`AnalysisJobManager` and friends are use-case orchestration (need
persistence/scheduling), so they belong in `backend/api` per the existing
"Backend API - use-case orchestration, workflow" role - not a new module,
consistent with "don't add a module ahead of the milestone that needs
it." `EngineeringQaService`/`DesignIterationManager` also start here;
revisit only if MIDAS-P09/P10 outgrows this placement.

**MIDAS-P01 itself only needs `AnalysisEngine`, `MidasCivilNxAnalysisEngine`,
`MidasApiClient`, a minimal `MidasModelBuilder`, and a minimal
`MidasResultExtractor`/`Mapper`** - everything else in this section is
the target shape for later MIDAS-P02+, not P01's scope.

## 5. Proposed domain models (P01-minimal, full shape noted)

```java
// backend/analysis-api - matches existing SI-units, record-based style
public record AnalysisRequest(
        UUID alternativeId,
        List<AnalysisNode> nodes,          // P01: yes
        List<AnalysisElement> elements,    // P01: yes
        AnalysisMaterial material,         // P01: yes, ONE material
        AnalysisSection section,           // P01: yes, ONE section
        List<BoundaryCondition> supports,  // P01: yes, simple pin/roller
        List<LoadCase> loadCases,          // P01: self-weight + one more
        List<LoadCombination> combinations,// P01: empty - deferred
        List<ConstructionStage> stages,    // P01: empty - deferred
        AnalysisLevel level,
        Set<RequestedResult> requestedResults) { }
```

`LoadModel`/`LoadCase`/`ConstructionStage`/tendon types do not exist yet
anywhere in `bridge-core` - they are new concepts the prompt itself asks
for (section 4). Per the "don't invent, don't build ahead of milestone"
rule: only the P01-minimal subset (self-weight + one nodal/beam load
case) should actually be implemented now; the rest of the shape above is
recorded so later milestones (MIDAS-P04 through P08) have a stable target
instead of repeated refactors, but their *fields* stay unfilled/absent
until each respective milestone is approved.

```java
public record AnalysisResult(
        UUID alternativeId,
        AnalysisLevel level,
        AnalysisStatus status,
        List<ReactionResult> reactions,        // P01: yes
        List<DisplacementResult> displacements,// P01: yes
        List<GirderResult> girderResults,      // P01: empty
        List<PierResult> pierResults,          // P01: empty
        List<BearingResult> bearingResults,    // P01: empty
        List<FoundationResult> foundationResults, // P01: empty
        List<GlobalCheck> globalChecks,        // P01: empty - EngineeringQaService is P02+
        List<String> criticalCases) { }        // P01: empty
```

`ModelMapping` (SPANOVA id <-> MIDAS numeric id) is required even for
P01, since result extraction needs to know which MIDAS node/element
corresponds to which SPANOVA object.

## 6. Proposed MIDAS-P01 sequence

Per the prompt's own scoping (section 26): **one very simple bridge, not
the general pipeline.**

1. Engineer supplies Base URL + MAPI-Key (their own Civil NX, API
   Settings, Connect) - given to the backend via configuration, not
   hardcoded.
2. `MidasApiClient.call("POST", "/doc/NEW", {"Argument": {}})` - or
   confirm via the detail page whether `/doc/NEW` needs different args.
3. `MidasModelBuilder` translates a trivial `AnalysisRequest` (e.g. a
   single 20 m simply-supported beam, 2 nodes, 1 beam element, 1
   material, 1 section, pin+roller supports, self-weight load case) into
   ordered `/db/*` calls: `UNIT` -> `MATL` -> `SECT` -> `NODE` -> `ELEM` ->
   `CONS` -> `BODF`.
4. `POST /doc/ANAL {}` - run analysis. **First thing to verify empirically**:
   does this call block until the analysis finishes, or return
   immediately (needing a status-poll loop)?
5. `MidasResultExtractor` calls `POST /post/table` with
   `TABLE_TYPE` for reactions and displacements, `NODE_ELEMS` selecting
   the model's own nodes, `UNIT` set to match SPANOVA's SI convention.
6. `MidasResultMapper` converts the raw table response into
   `AnalysisResult` via `ModelMapping`.
7. Automated test compares the mapped `AnalysisResult` against a
   manually-recorded reference (section 7 below) within an engineering
   tolerance (tolerance value itself must come from the engineer, not be
   invented - same rule as everywhere else in this project).
8. Error path: force one failure (e.g. wrong MAPI-Key, or Civil NX not
   connected) and confirm `AnalysisJob` reaches `FAILED` with a captured
   error message rather than throwing an unhandled exception.

## 7. Validation against a manually-built MIDAS reference model

1. The **engineer** builds the same trivial model (single-span simply
   supported beam, one self-weight case) directly in Civil NX's own GUI,
   by hand - no API involved.
2. The engineer runs the analysis there and records the reference
   reactions and displacements themselves (or exports them via Civil
   NX's normal result tables).
3. SPANOVA's MIDAS-P01 code builds the *same* geometry/material/section/
   load through the API (step 6 above) and extracts the same result
   quantities via the API.
4. An automated test (`MidasCivilNxAnalysisEngineTest` or similar,
   `backend/midas-adapter/src/test`) asserts SPANOVA's API-derived values
   match the engineer's manually-recorded reference within a tolerance
   the engineer specifies.
5. This is the P01 "round trip" proof: SPANOVA can create a model MIDAS
   accepts, MIDAS solves it, SPANOVA retrieves matching results - before
   any batching, optimization, or additional load types are attempted.

## Open items before MIDAS-P01 can start (blocking, need the engineer)

1. **Base URL + MAPI-Key** from the engineer's own licensed Civil NX
   (API Settings panel) - cannot be generated or substituted.
2. **Tolerance value** for comparing API-derived vs. manually-verified
   results (section 22 of the prompt: never invent a limit/tolerance).
3. Confirmation of the **exact `TABLE_TYPE` strings** for reaction/
   displacement tables and the **exact `/db/SECT`/`/db/MATL` field
   schema** for a simple beam section/material - both exist as
   documented pages not yet individually read; reading them is a
   research step, not something requiring the engineer, and can happen
   right before MIDAS-P01 coding starts.
4. Whether `POST /doc/ANAL` is synchronous or needs status polling -
   an empirical question, answered by the first real MIDAS-P01 test run
   against the engineer's Civil NX instance.

Per the prompt's own instruction (section 27, point 10): **stopping here.
No production code written.** Waiting for review/approval of this
analysis before MIDAS-P01 implementation begins.
