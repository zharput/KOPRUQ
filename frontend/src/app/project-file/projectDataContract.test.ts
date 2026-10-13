import { beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_DATA_ENTRIES, type ProjectDataEntry } from './projectDataContract'
import { PROJECT_DATA_CHANGED_EVENT } from '../../shared/project-file/projectDataEvents'
import { buildProjectFile } from './projectFileService'
import { PROJECT_MODULES, PROJECT_MODULE_IDS } from './projectModules'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { createEmptyGraph, exportGraphDocuments, importGraphDocuments } from '../../features/graph/state/graphStore'
import { FAMILY_CATEGORIES, familyStorageKey } from '../../features/family-registry/model/familyRepository'

const SAMPLE_MODULES: Record<string, unknown> = {
  girderLibrary: { dimensions: [{ key: 'H', label: 'H (cm)', min: 160, max: 170, delta: 10 }] },
  preferredSpanRules: [{ id: 'girder-span-PG-H160', superstructureType: 'PRECAST_GIRDER', girderVariantId: 'PG-H160', minSpan: 20, maxSpan: 30, spanDelta: 5, primarySpan: 25, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' }],
  seismicInputs: { a: '0.2', g: 'C', t: 'Type 2', i: '1.2' },
  windInputs: { vb: '27', terrain: 'III', ze: '12' },
  temperatureInputs: { min: '-20', max: '40', t0: '10' },
  crossSectionValues: { platformWidthM: 12, leftWalkwayM: 1.1, rightWalkwayM: 1.2, spaceOfGirderM: 2.1, numberOfGirders: 4 },
  selfWeightInputs: { asphaltThicknessM: 0.12, asphaltUnitWeightKNm3: 23, sidewalkThicknessM: 0.2, sidewalkUnitWeightKNm3: 25, faciaCount: 2, faciaWidthM: 0.6, faciaThicknessM: 0.1, faciaUnitWeightKNm3: 25, guardrailCount: 1, guardrailUnitLoadKNm: 2, pedestrianRailingCount: 2, pedestrianRailingUnitLoadKNm: 1.5, protectiveFenceCount: 0, protectiveFenceUnitLoadKNm: 1, soundPanelCount: 1, soundPanelUnitLoadKNm: 1 },
  trafficLm1: { tandemSystem: [], udl: [], remainingAreaUdl: { label: 'Remaining' } },
}
function sample(entry: ProjectDataEntry<unknown>, variant: 'A' | 'B'): unknown {
  if (entry.id === 'graph') { const graph = createEmptyGraph(`Graph ${variant}`); graph.nodes.push({ id: `n-${variant}`, type: 'math.add', name: 'Add', position: { x: 1, y: 2 }, parameters: { a: variant === 'A' ? 1 : 2 } }); return { activeGraphId: graph.id, graphs: [graph] } }
  if (entry.filePath[0] === 'families') return [{ id: `${entry.filePath[1]}-${variant}`, name: variant }]
  const base = SAMPLE_MODULES[entry.filePath[1]] as Record<string, unknown> | unknown[]
  if (variant === 'A') return base
  if (entry.filePath[1] === 'seismicInputs') return { a: '0.9', g: 'B', t: 'Type 1', i: '2' }
  if (entry.filePath[1] === 'windInputs') return { vb: '99', terrain: 'I', ze: '1' }
  if (entry.filePath[1] === 'temperatureInputs') return { min: '-5', max: '30', t0: '15' }
  if (entry.filePath[1] === 'crossSectionValues') return { platformWidthM: 14, leftWalkwayM: 1, rightWalkwayM: 1, spaceOfGirderM: 2, numberOfGirders: 5 }
  if (entry.filePath[1] === 'girderLibrary') return { dimensions: [] }
  if (entry.filePath[1] === 'preferredSpanRules') return [{ ...(base as Record<string, unknown>[])[0], id: 'other', primarySpan: 22 }]
  if (entry.filePath[1] === 'selfWeightInputs') return { ...(base as Record<string, unknown>), faciaCount: 3 }
  return { ...(base as Record<string, unknown>), udl: [{ x: 1 }] }
}
const events = () => { const seen: unknown[] = []; const on = (event: Event) => seen.push((event as CustomEvent).detail); window.addEventListener(PROJECT_DATA_CHANGED_EVENT, on); return { seen, stop: () => window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, on) } }

beforeEach(() => { localStorage.clear(); const graph = createEmptyGraph('Reset'); importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] }); localStorage.clear() })

describe('project data contract', () => {
  it('declares graph, five family catalogs and eight modules in order, with 14 unique storage keys', () => {
    expect(PROJECT_DATA_ENTRIES.map((entry) => entry.id)).toEqual(['graph', ...FAMILY_CATEGORIES.map((c) => `families.${c}`), ...PROJECT_MODULE_IDS.map((id) => `modules.${id}`)])
    expect(FAMILY_CATEGORIES).toEqual(['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL'])
    const keys = PROJECT_DATA_ENTRIES.flatMap((entry) => entry.storageKeys)
    expect(keys).toHaveLength(14); expect(new Set(keys).size).toBe(14)
    expect(keys).toContain('kopruq.graph.documents.v1'); FAMILY_CATEGORIES.forEach((c) => expect(keys).toContain(familyStorageKey(c))); PROJECT_MODULE_IDS.forEach((id) => expect(keys).toContain(PROJECT_MODULES[id].key))
    expect(PROJECT_DATA_ENTRIES.find((e) => e.id === 'graph')!.presence).toBe('required')
    expect(PROJECT_DATA_ENTRIES.filter((e) => e.presence === 'optional-reset-and-report')).toHaveLength(8)
  })
  it('keeps the project file top-level, families and modules layout', () => {
    const file = buildProjectFile({ project: INITIAL_PROJECT, bridges: [] }, { selectedBridgeId: null, definitions: {} })
    expect(Object.keys(file)).toEqual(['format', 'schemaVersion', 'applicationVersion', 'projectState', 'bridgeDefinitions', 'graph', 'families', 'modules'])
    expect(Object.keys(file.families)).toEqual(['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL'])
    expect(Object.keys(file.modules)).toEqual([...PROJECT_MODULE_IDS])
    expect(file.schemaVersion).toBe(1)
  })

  describe.each(PROJECT_DATA_ENTRIES.map((entry) => [entry.id, entry] as const))('%s', (_id, entry) => {
    it('round-trips exportValue -> parse -> apply', () => {
      entry.apply(entry.parse(sample(entry, 'A')))
      const exported = JSON.parse(JSON.stringify(entry.exportValue()))
      entry.reset(); entry.apply(entry.parse(exported))
      expect(JSON.parse(JSON.stringify(entry.exportValue()))).toEqual(exported)
    })
    it('emits kopruq:project-data-changed when apply changes the value', () => {
      entry.apply(entry.parse(sample(entry, 'A')))
      const watcher = events(); entry.apply(entry.parse(sample(entry, 'B'))); watcher.stop()
      expect(watcher.seen.length).toBeGreaterThan(0)
    })
    it('snapshot -> apply(other) -> restore brings the previous value back', () => {
      entry.apply(entry.parse(sample(entry, 'A')))
      const before = JSON.stringify(entry.exportValue()); const snap = entry.snapshot()
      entry.apply(entry.parse(sample(entry, 'B'))); expect(JSON.stringify(entry.exportValue())).not.toBe(before)
      entry.restore(snap); expect(JSON.stringify(entry.exportValue())).toBe(before)
    })
    it('reset goes to the empty state', () => {
      entry.apply(entry.parse(sample(entry, 'A'))); entry.reset()
      if (entry.id === 'graph') { const graphs = (entry.exportValue() as ReturnType<typeof exportGraphDocuments>).graphs; expect(graphs).toHaveLength(1); expect(graphs[0].nodes).toEqual([]) }
      else if (entry.id.startsWith('families.') || entry.id === 'modules.girderLibrary') expect(entry.exportValue()).toEqual([])
      else { expect(entry.exportValue()).toBeNull(); entry.storageKeys.forEach((key) => expect(localStorage.getItem(key)).toBeNull()) }
    })
  })
})
