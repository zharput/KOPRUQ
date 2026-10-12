# Baseline: npm test (Faz 0)

Komut: `npm test` (vitest run), exit 1.

```
 Test Files  6 failed | 56 passed (62)
      Tests  26 failed | 430 passed (456)
```

26 başarısız test (plan §2.4 ile aynı sayı: 6 dosya / 26 test). Dosya: test adı:

- src/app/App.test.tsx > App workspace shell > opens the read-only Graph-generated Family Workspace
- src/features/graph/ui/BaseNode.test.tsx > Watch node rendering > renders editable Range Start/End/Step, an immediate value count, and disables a connected editor
- src/features/graph/ui/BaseNode.test.tsx > canvas port labels and structural family theme > input.integer keeps the editor and removes the redundant Value label
- src/features/graph/ui/BaseNode.test.tsx > canvas port labels and structural family theme > input.number keeps the editor and removes the redundant Value label
- src/features/graph/ui/EditableNumericInput.test.tsx > editable numeric input buffer > rejects decimal text in Integer editors and contains canvas shortcut propagation
- src/features/graph/ui/EditableNumericInput.test.tsx > editable numeric input buffer > retains an empty blurred editor as invalid without converting it to zero
- src/features/graph/ui/EditableNumericInput.test.tsx > editable numeric input buffer > supports select-all replacement and commits once on Enter
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > keeps rectangular pier B/D dimensions semantic for B=3, D=1.5
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > keeps rectangular pier B/D dimensions semantic for B=3, D=4
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > keeps rectangular pier B/D dimensions semantic for B=5, D=1.5
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > projects substructure.pier.box local lengths through the active project unit
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > projects substructure.pier.circular local lengths through the active project unit
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > projects substructure.pier.h_section local lengths through the active project unit
- src/features/graph/ui/EngineeringNodeShell.test.tsx > reusable engineering node shell > projects substructure.pier.rectangular local lengths through the active project unit
- src/features/graph/ui/ListOutputNode.test.tsx > List output node > expands a PierCandidate into generic labeled engineering fields
- src/features/graph/ui/ListOutputNode.test.tsx > List output node > renders compact Rectangular and T-Cap candidate rows and details
- src/features/graph/ui/ListOutputNode.test.tsx > List output node > renders shallow and piled foundation candidates with source candidate-derived Lx/Ly
- src/features/graph/ui/ListOutputNode.test.tsx > List output node > renders the full Elastomeric Bearing candidate geometry and distinct stiffness units
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > converts a local numeric value when its unit selector changes
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > converts schematic values to Project display units and indicates connected ranges
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > draws T-Cap flange at the bottom with its stem extending upward
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > shows H-section dimensions with B transverse and D longitudinal
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > shows piled foundation pile grid in PLAN and cap/piles in SECTION using derived geometry
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > shows shallow foundation PLAN and SECTION with Lx, Ly, H and axis
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > updates the schematic from changed local parameters without waiting for Run
- src/features/graph/ui/NodeInspector.test.tsx > Node Inspector > uses a rounded obround for Oval Pier with resolved B and D and reference axes

Plan §2.4 ile fark: yok (sayı ve dosya kümesi aynı: App, BaseNode, EditableNumericInput, EngineeringNodeShell, ListOutputNode, NodeInspector).
