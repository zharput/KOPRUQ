# KOPRUQ Data Architecture (Phase 2E)

## Ownership

- **Project** owns project metadata, codes, units, corridor inputs, terrain references, geotechnics, environment and cost data.
- **Family Repository** is the single access boundary for reusable family catalogs. It preserves the current project catalog keys and stable family IDs; Family Tables remains the authoring UI. The repository is an adapter over existing project persistence, not a second database.
- **Graph** will own relationships, rules, variables and generation workflow. Graph nodes store `{ category, familyId }` references and resolve current family records through the repository.
- **Generated Bridge Model** is output from Graph/generation. It owns generated geometry, spans, axes, assignments and alternative metadata; it is not a manually authored prerequisite.
- **Analysis** consumes generated models and engineering inputs. **Optimization** controls design variables/objectives/constraints over alternatives. **Results** presents verified analysis and optimization output.

## Flow and single source of truth

```text
Project Data + Family Repository + Design Rules + Constraints
                           -> Graph -> Generation
                           -> Generated Bridge Alternatives
                           -> Analysis -> Optimization -> Results -> BIM / Export
```

Family Tables, future Graph adapters, Assembly selectors and retained Bridge Definition selectors use the same persisted catalog records. Consumers keep IDs/references; they do not persist independent copies of family definitions. UI selection and unsaved drafts are transient UI state.

The current browser adapter preserves existing `localStorage` keys and record shapes for Pier, Pier Cap, Foundation and Bearing. This avoids data migration and preserves existing references. `graphFamilyAdapter` resolves family references at read time and exposes parameter descriptors where the current family model is sufficiently defined. Piled foundation Lx/Ly remain derived by `derivePiledFoundationDimensions` in Foundation domain logic; Ly uses Y pile spacing.

## Current catalog coverage and migration notes

| Category | Current source | Phase 2E status |
|---|---|---|
| Pier | `kopruq.project-design-system.pier-families` | Repository-backed; stable IDs retained. |
| Pier Cap | `kopruq.project-design-system.pier-cap-families` | Repository-backed; stable IDs retained. |
| Foundation | `kopruq.project-design-system.foundation-families` | Repository-backed; stable IDs and domain-derived piled geometry retained. |
| Bearing | `kopruq.project-design-system.bearing-families` | Repository-backed; stable IDs retained. |
| Girder | `kopruq.girder-library.precast` | Existing dimension record and generated variant IDs remain. Not yet a stable family catalog; adapter migration is future work. |
| Superstructure | App-owned cross-section state consumed by Superstructure and Loads UI | No reusable stable-ID family model yet; no record conversion performed. |
| Abutment | No family catalog exists | Not fabricated in this phase. |
| Material | `kopruq.project-design-system.material-assignments` | Concrete class per structural element, not a material-property family catalog. No material properties or IDs invented. |

Family catalog React state is shared through a repository-backed subscription hook. UI-only selection/drafts remain local. Project-level state and bridge-instance definitions retain their existing stores and responsibilities.

Phase 3B.1 Graph material nodes reuse the concrete class ID list from the Materials feature and resolve supported concrete properties through the existing Java `EurocodeConcrete` domain utility. This does not expand the legacy element-assignment table into a second material database. Reinforcement, prestressing and structural steel remain unavailable until a project-owned source catalog is approved.

## Bridge Definition reuse inventory

Bridge Definition is removed from primary navigation but remains routable at `/bridge-definition` for compatibility and development inspection. Existing data is preserved. The current workspace stores bridge-specific span/axis configuration, family ID assignments, construction notes, constraints and view selection. Alignment import references and terrain references are maintained through Project environment/import state; the Bridge Definition UI hosts related import/view tools. Reusable 3D, plan/profile, geometry, axis and constraint components are candidates for Generated Bridge Model, alternative and geometry inspectors. No component is deleted or renamed in Phase 2E.

| Existing capability | Classification | Future reuse |
|---|---|---|
| Bridge Definition 3D / Plan / Profile view modes and support-axis schematics | Keep for generated-model viewing | Generated Bridge Viewer, Alternative Inspector, Geometry Inspector |
| Axis family selectors and assignment summaries | Keep for inspection | Generated Bridge Model / Assembly Inspector; resolve IDs through Family Repository |
| Span arrangement and axis derivation | Keep as reusable geometry logic | Generator input/output inspection; no generation logic added now |
| Bridge-local named constraints and constraint editor | Keep for migration review | Move/reconcile corridor-level constraints into Project inputs before Graph consumes them |
| LandXML alignment import and profile tools | Keep for Project/Corridor input | Alignment remains a generation input; existing import IDs and algorithms are preserved |
| Terrain references, DTM and terrain viewer | Keep for Project data / preview | Project owns terrain datasets; generated model viewer may reuse terrain visualization |
| Construction notes and legacy assembly overview | Keep for inspection | Candidate Generated Model / Assembly Inspector |
| Potentially duplicate or unused components | None classified | No deprecation or deletion without a verified usage audit |

## Known gaps before Graph

- Girder and Superstructure need stable family-domain records before Graph nodes can reference them as reusable families.
- Abutment family definitions do not exist yet.
- Material assignments are not a material catalog and do not provide material-property references.
- The browser repository preserves current local persistence; backend/project-level transactional persistence is future work.
- Bridge Definition constraints and axes remain legacy bridge-instance state until a future migration moves corridor inputs/constraints to Project ownership. No alignment algorithm or stored ID is rewritten here.
