import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { ProjectDataValidationError } from '../../shared/project-store/projectDataValidation'
import { CANONICAL_PROJECT_DOCUMENT_JSON as CANONICAL, NEW_PROJECT_DOCUMENT_JSON as NEW_PROJECT } from './projectDocumentFixtures'
import { GRAPH_COLLECTION_DEFINITION, PROJECT_SECTION_DEFINITIONS, createProjectRequestBody, loadProjectDocument, projectDocumentSchema } from './projectDocument'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
afterEach(() => { vi.restoreAllMocks() })

const SECTION_PATHS = ['workspace', 'bridge-definitions', 'families/piers', 'families/pier-caps', 'families/foundations', 'families/bearings', 'families/materials', 'girder-library', 'preferred-span-rules', 'cross-section', 'loads/seismic', 'loads/wind', 'loads/temperature', 'loads/self-weight', 'loads/traffic-lm1', 'loads/wind-snapshot']

describe('loadProjectDocument', () => {
  it('maps the canonical document: all 12 keys', () => {
    const loaded = loadProjectDocument(clone(CANONICAL))
    expect(loaded).toMatchObject({ projectId: CANONICAL.projectId, revision: 17, createdAt: '2026-10-13T09:00:00Z', updatedAt: '2026-10-13T10:30:00Z' })
    expect(loaded.workspace?.project.name).toBe('Corridor 7'); expect(loaded.workspace?.project.environment).toEqual({ terrainDatasetId: null, landXmlImportId: 'landxml-1' })
    expect(loaded.workspace?.bridges.map((b) => b.id)).toEqual(['bridge-1', 'bridge-2']); expect(loaded.workspace?.bridges[1].girderDepthCm).toBeNull()
    expect(Object.keys(loaded.bridgeDefinitions?.definitions ?? {})).toEqual(['bridge-1']); expect(loaded.bridgeDefinitions?.definitions['bridge-1'].axes.map((a) => a.id)).toEqual(['A1', 'P1', 'P2', 'A2'])
    expect(loaded.bridgeDefinitions?.definitions['bridge-1'].axisAssignments.P1.pierHeightM).toBe(12.5)
    expect(loaded.families.PIER?.map((f) => f.id)).toEqual(['pier-circ', 'pier-legacy', 'pier-wall']); expect(loaded.families.PIER?.[1].pierType).toBe('H_TYPE')
    expect(loaded.families.PIER_CAP).toHaveLength(2); expect(loaded.families.PIER_CAP?.[1].stemWidth).toBeNull()
    expect(loaded.families.FOUNDATION?.[1].piledGeneration?.pileCountX).toEqual({ min: 2, max: 3, delta: 1 }); expect(loaded.families.BEARING?.[0].length).toEqual({ min: 300, max: 500, delta: 50 })
    expect(loaded.families.MATERIAL?.[0]).toEqual({ id: 'FOUNDATION', no: 2, element: 'Foundation', concreteClass: 'C30/37' })
    expect(loaded.girderLibrary?.enabled).toBe(true); expect(loaded.girderLibrary?.dimensions).toHaveLength(2)
    expect(loaded.preferredSpanRules?.[0].primarySpan).toBe(25); expect(loaded.crossSection).toEqual({ platformWidthM: 13.8, leftWalkwayM: 1, rightWalkwayM: 1.5, spaceOfGirderM: 2, numberOfGirders: 5 })
    expect(loaded.loads.seismic).toEqual({ a: '0.2', g: 'C', t: 'Type 2', i: '1.2' }); expect(loaded.loads.wind?.vb).toBe('27'); expect(loaded.loads.temperature?.min).toBe('-20')
    expect(loaded.loads.selfWeight?.soundPanelUnitLoadKNm).toBe(1); expect(loaded.loads.trafficLm1?.tandemSystem[0].adjustmentFactor.value).toBeNull()
    expect(loaded.loads.windSnapshot).toEqual({ schemaVersion: 1, inputs: { vb: '27', terrain: 'III', ze: '12', deckWidthM: 13.8, drefM: 2.1 } })
    expect(loaded.graphs.map((g) => g.id)).toEqual(['graph-1', 'graph-2', 'graph-3'])
    expect(loaded.graphs[0].nodes[0].parameters).toEqual({ value: 35, flag: true, label: 'abc', list: [30, 35, 40], none: [] })
    expect('groups' in loaded.graphs[1]).toBe(false); expect(loaded.graphs[2].groups).toEqual([])
  })
  it('maps a new project: workspace filled, every other section undefined, graphs []', () => {
    const loaded = loadProjectDocument(clone(NEW_PROJECT))
    expect(loaded.revision).toBe(1); expect(loaded.workspace?.project.name).toBe('Corridor 7'); expect(loaded.workspace?.bridges).toEqual([])
    expect(loaded.bridgeDefinitions).toBeUndefined(); expect(loaded.girderLibrary).toBeUndefined(); expect(loaded.preferredSpanRules).toBeUndefined(); expect(loaded.crossSection).toBeUndefined()
    expect(Object.values(loaded.families).every((value) => value === undefined)).toBe(true); expect(Object.keys(loaded.families)).toEqual(['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL'])
    expect(Object.values(loaded.loads).every((value) => value === undefined)).toBe(true); expect(Object.keys(loaded.loads)).toHaveLength(6)
    expect(loaded.graphs).toEqual([])
  })
  it('keeps a written empty family list ([]) apart from an unwritten one (null)', () => {
    const doc = clone(NEW_PROJECT); doc.families = { ...doc.families, piers: [] as never, bearings: [] as never }
    const loaded = loadProjectDocument(doc)
    expect(loaded.families.PIER).toEqual([]); expect(loaded.families.BEARING).toEqual([]); expect(loaded.families.PIER_CAP).toBeUndefined()
  })
  it('W -> T -> W: every section maps back to the canonical JSON value', () => {
    const loaded = loadProjectDocument(clone(CANONICAL))
    const byPath = Object.fromEntries(PROJECT_SECTION_DEFINITIONS.map((definition) => [definition.path, definition.codec]))
    expect(byPath['workspace'].toWire(loaded.workspace)).toEqual(CANONICAL.workspace)
    expect(byPath['bridge-definitions'].toWire(loaded.bridgeDefinitions)).toEqual(CANONICAL.bridgeDefinitions)
    expect(byPath['families/piers'].toWire(loaded.families.PIER)).toEqual(CANONICAL.families.piers)
    expect(byPath['families/pier-caps'].toWire(loaded.families.PIER_CAP)).toEqual(CANONICAL.families.pierCaps)
    expect(byPath['families/foundations'].toWire(loaded.families.FOUNDATION)).toEqual(CANONICAL.families.foundations)
    expect(byPath['families/bearings'].toWire(loaded.families.BEARING)).toEqual(CANONICAL.families.bearings)
    expect(byPath['families/materials'].toWire(loaded.families.MATERIAL)).toEqual(CANONICAL.families.materials)
    expect(byPath['girder-library'].toWire(loaded.girderLibrary)).toEqual(CANONICAL.girderLibrary)
    expect(byPath['preferred-span-rules'].toWire(loaded.preferredSpanRules)).toEqual(CANONICAL.preferredSpanRules)
    expect(byPath['cross-section'].toWire(loaded.crossSection)).toEqual(CANONICAL.crossSection)
    expect(byPath['loads/seismic'].toWire(loaded.loads.seismic)).toEqual(CANONICAL.loads.seismic)
    expect(byPath['loads/wind'].toWire(loaded.loads.wind)).toEqual(CANONICAL.loads.wind)
    expect(byPath['loads/temperature'].toWire(loaded.loads.temperature)).toEqual(CANONICAL.loads.temperature)
    expect(byPath['loads/self-weight'].toWire(loaded.loads.selfWeight)).toEqual(CANONICAL.loads.selfWeight)
    expect(byPath['loads/traffic-lm1'].toWire(loaded.loads.trafficLm1)).toEqual(CANONICAL.loads.trafficLm1)
    expect(byPath['loads/wind-snapshot'].toWire(loaded.loads.windSnapshot)).toEqual(CANONICAL.loads.windSnapshot)
    expect(loaded.graphs.map((g) => GRAPH_COLLECTION_DEFINITION.codec.toWire(g))).toEqual(CANONICAL.graphs)
  })
  it('W -> T -> W is also exact for the serialized key order', () => {
    const loaded = loadProjectDocument(clone(CANONICAL))
    expect(JSON.stringify(PROJECT_SECTION_DEFINITIONS[0].codec.toWire(loaded.workspace))).toBe(JSON.stringify(CANONICAL.workspace))
    expect(JSON.stringify(loaded.graphs.map((g) => GRAPH_COLLECTION_DEFINITION.codec.toWire(g)))).toBe(JSON.stringify(CANONICAL.graphs))
  })
  it('W -> T -> W serializes byte for byte (key order included) for ALL 16 sections and every graph', () => {
    const loaded = loadProjectDocument(clone(CANONICAL))
    const loadedByPath: Record<string, unknown> = {
      'workspace': loaded.workspace, 'bridge-definitions': loaded.bridgeDefinitions,
      'families/piers': loaded.families.PIER, 'families/pier-caps': loaded.families.PIER_CAP, 'families/foundations': loaded.families.FOUNDATION,
      'families/bearings': loaded.families.BEARING, 'families/materials': loaded.families.MATERIAL,
      'girder-library': loaded.girderLibrary, 'preferred-span-rules': loaded.preferredSpanRules, 'cross-section': loaded.crossSection,
      'loads/seismic': loaded.loads.seismic, 'loads/wind': loaded.loads.wind, 'loads/temperature': loaded.loads.temperature,
      'loads/self-weight': loaded.loads.selfWeight, 'loads/traffic-lm1': loaded.loads.trafficLm1, 'loads/wind-snapshot': loaded.loads.windSnapshot,
    }
    const canonicalByPath: Record<string, unknown> = {
      'workspace': CANONICAL.workspace, 'bridge-definitions': CANONICAL.bridgeDefinitions,
      'families/piers': CANONICAL.families.piers, 'families/pier-caps': CANONICAL.families.pierCaps, 'families/foundations': CANONICAL.families.foundations,
      'families/bearings': CANONICAL.families.bearings, 'families/materials': CANONICAL.families.materials,
      'girder-library': CANONICAL.girderLibrary, 'preferred-span-rules': CANONICAL.preferredSpanRules, 'cross-section': CANONICAL.crossSection,
      'loads/seismic': CANONICAL.loads.seismic, 'loads/wind': CANONICAL.loads.wind, 'loads/temperature': CANONICAL.loads.temperature,
      'loads/self-weight': CANONICAL.loads.selfWeight, 'loads/traffic-lm1': CANONICAL.loads.trafficLm1, 'loads/wind-snapshot': CANONICAL.loads.windSnapshot,
    }
    expect(Object.keys(loadedByPath)).toEqual(SECTION_PATHS); expect(Object.keys(canonicalByPath)).toEqual(SECTION_PATHS)
    for (const definition of PROJECT_SECTION_DEFINITIONS) {
      expect(JSON.stringify(definition.codec.toWire(loadedByPath[definition.path])), definition.path).toBe(JSON.stringify(canonicalByPath[definition.path]))
    }
    loaded.graphs.forEach((graph, index) => {
      expect(JSON.stringify(GRAPH_COLLECTION_DEFINITION.codec.toWire(graph)), graph.id).toBe(JSON.stringify(CANONICAL.graphs[index]))
    })
  })
  it('every section schema re-serializes the canonical wire value byte for byte (key order of schema = backend order = toWire order)', () => {
    const wireByPath: Record<string, unknown> = {
      'workspace': CANONICAL.workspace, 'bridge-definitions': CANONICAL.bridgeDefinitions,
      'families/piers': CANONICAL.families.piers, 'families/pier-caps': CANONICAL.families.pierCaps, 'families/foundations': CANONICAL.families.foundations,
      'families/bearings': CANONICAL.families.bearings, 'families/materials': CANONICAL.families.materials,
      'girder-library': CANONICAL.girderLibrary, 'preferred-span-rules': CANONICAL.preferredSpanRules, 'cross-section': CANONICAL.crossSection,
      'loads/seismic': CANONICAL.loads.seismic, 'loads/wind': CANONICAL.loads.wind, 'loads/temperature': CANONICAL.loads.temperature,
      'loads/self-weight': CANONICAL.loads.selfWeight, 'loads/traffic-lm1': CANONICAL.loads.trafficLm1, 'loads/wind-snapshot': CANONICAL.loads.windSnapshot,
    }
    expect(Object.keys(wireByPath)).toEqual(SECTION_PATHS)
    for (const definition of PROJECT_SECTION_DEFINITIONS) {
      const wire = wireByPath[definition.path]
      expect(JSON.stringify(definition.codec.schema.parse(JSON.parse(JSON.stringify(wire)))), definition.path).toBe(JSON.stringify(wire))
    }
    for (const graph of CANONICAL.graphs) expect(JSON.stringify(GRAPH_COLLECTION_DEFINITION.codec.schema.parse(JSON.parse(JSON.stringify(graph)))), graph.id).toBe(JSON.stringify(graph))
    expect(JSON.stringify(projectDocumentSchema.parse(clone(CANONICAL)))).toBe(JSON.stringify(CANONICAL))
  })
  it('the schema keys are the 12 backend keys in the backend order', () => {
    expect(Object.keys(projectDocumentSchema.shape)).toEqual(['projectId', 'revision', 'createdAt', 'updatedAt', 'workspace', 'bridgeDefinitions', 'families', 'girderLibrary', 'preferredSpanRules', 'crossSection', 'loads', 'graphs'])
    expect(Object.keys(CANONICAL)).toEqual(Object.keys(projectDocumentSchema.shape)); expect(Object.keys(NEW_PROJECT)).toEqual(Object.keys(projectDocumentSchema.shape))
  })
  it('an invalid document throws ProjectDataValidationError with the exact path and touches no storage or event', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem'); const dispatch = vi.spyOn(window, 'dispatchEvent')
    const doc = clone(CANONICAL) as { workspace: { bridges: { spansM: unknown[] }[] } }; doc.workspace.bridges[0].spansM[0] = 'x'
    const error = (() => { try { loadProjectDocument(doc) } catch (e) { return e as ProjectDataValidationError } })()!
    expect(error).toBeInstanceOf(ProjectDataValidationError)
    expect(error.message).toBe('Invalid project data: workspace.bridges[0].spansM[0] - Expected number, received string')
    expect(() => loadProjectDocument(clone(CANONICAL))).not.toThrow()
    expect(setItem).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled()
  })
  it('rejects contract drift: an unknown top-level key, an unknown nested key and a null families object', () => {
    expect(() => loadProjectDocument({ ...clone(CANONICAL), extra: 1 })).toThrow(ProjectDataValidationError)
    const nested = clone(CANONICAL) as unknown as { graphs: { nodes: { parameters: { kind: string }[] }[] }[] }; nested.graphs[0].nodes[0].parameters[0].kind = 'OBJECT'
    expect(() => loadProjectDocument(nested)).toThrow('graphs[0].nodes[0].parameters[0].kind')
    expect(() => loadProjectDocument({ ...clone(CANONICAL), families: null })).toThrow('families')
    expect(() => loadProjectDocument(null)).toThrow('Invalid project data: (root)')
  })
})

describe('section definitions', () => {
  it('lists exactly the 16 PUT paths in order; only the last 9 are clearable', () => {
    expect(PROJECT_SECTION_DEFINITIONS.map((d) => d.path)).toEqual(SECTION_PATHS)
    expect(PROJECT_SECTION_DEFINITIONS.map((d) => d.codec.clearable)).toEqual([false, false, false, false, false, false, false, true, true, true, true, true, true, true, true, true])
    expect(new Set(PROJECT_SECTION_DEFINITIONS.map((d) => d.id)).size).toBe(16)
  })
  it('the graph collection produces graphs/<id> paths', () => {
    expect(GRAPH_COLLECTION_DEFINITION.pathOf('abc')).toBe('graphs/abc')
  })
  it('createProjectRequestBody wraps INITIAL_PROJECT with no bridges into { workspace }', () => {
    const body = createProjectRequestBody({ project: INITIAL_PROJECT, bridges: [] })
    expect(Object.keys(body)).toEqual(['workspace']); expect(Object.keys(body.workspace)).toEqual(['project', 'bridges']); expect(body.workspace.bridges).toEqual([])
    expect(Object.keys(body.workspace.project)).toHaveLength(26)
    expect(body.workspace.project).toEqual(INITIAL_PROJECT)
    expect(loadProjectDocument({ ...clone(NEW_PROJECT), workspace: JSON.parse(JSON.stringify(body.workspace)) }).workspace).toEqual({ project: INITIAL_PROJECT, bridges: [] })
  })
})
