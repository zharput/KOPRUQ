import { describe, expect, it } from 'vitest'
import { ProjectDataValidationError, WireMappingError, parseProjectData } from '../../../shared/project-store/projectDataValidation'
import { ensureBridgeIds, INITIAL_PROJECT, type PersistedProjectState } from './projectWorkspace'
import { workspaceFromWire, workspaceToWire, workspaceWireSchema, WORKSPACE_SECTION } from './projectWorkspaceWire'
import { INITIAL_BRIDGES } from './types'

const state = (): PersistedProjectState => ({ project: { ...INITIAL_PROJECT, name: 'Corridor', id: 'KB-1' }, bridges: ensureBridgeIds(INITIAL_BRIDGES) })

describe('workspace wire mapping', () => {
  it('round-trips INITIAL_PROJECT and the 12 inventory bridges (T -> W -> T)', () => {
    const original = state()
    const wire = workspaceToWire(original)
    expect(parseProjectData(workspaceWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(workspaceFromWire(wire)).toEqual(original)
    expect(wire.bridges[0].girderDepthCm).toBeNull(); expect(wire.bridges[0].girderNote).toBe('Box (fixed cross-section)'); expect(wire.bridges[1].girderDepthCm).toEqual([160, 190])
  })
  it('emits keys in the backend record order and drops passthrough fields', () => {
    const original = state(); const withExtra = { ...original, project: { ...original.project, extra: 'x' }, bridges: original.bridges.map((b) => ({ ...b, extra: 1 })) }
    const wire = workspaceToWire(withExtra as PersistedProjectState)
    expect(Object.keys(wire)).toEqual(['project', 'bridges'])
    expect(Object.keys(wire.project)).toEqual(['name', 'id', 'client', 'designer', 'country', 'region', 'projectType', 'status', 'startDate', 'targetDate', 'description', 'locationStart', 'locationEnd', 'coordinateSystem', 'designStandardFamily', 'concreteCode', 'steelCode', 'compositeCode', 'seismicCode', 'geotechnicalCode', 'trafficLoadStandard', 'units', 'coordinate', 'criteria', 'environment', 'lastModified'])
    expect(Object.keys(wire.project.units)).toEqual(['length', 'force', 'moment', 'stress', 'mass', 'temperature'])
    expect(Object.keys(wire.project.coordinate)).toEqual(['name', 'epsg', 'horizontalDatum', 'verticalDatum', 'originX', 'originY', 'originZ', 'northAngle'])
    expect(Object.keys(wire.project.criteria)).toEqual(['designLife', 'reliabilityClass', 'exposure', 'concreteClass', 'cover', 'philosophy'])
    expect(Object.keys(wire.project.environment)).toEqual(['terrainDatasetId', 'landXmlImportId'])
    expect(Object.keys(wire.bridges[0])).toEqual(['id', 'no', 'km', 'crossingType', 'estimatedLengthM', 'roadWidthM', 'terrain', 'status', 'bridgeType', 'spansM', 'girderDepthCm', 'girderNote', 'pierShape'])
    expect(JSON.stringify(wire)).not.toContain('extra')
  })
  it('sends numbers and strings unchanged and environment nulls explicitly', () => {
    const original = state(); original.bridges[1] = { ...original.bridges[1], spansM: [30.5, 35, 40], girderDepthCm: null }
    const wire = workspaceToWire(original)
    expect(wire.bridges[1].spansM).toEqual([30.5, 35, 40]); expect(wire.project.environment).toEqual({ terrainDatasetId: null, landXmlImportId: null })
  })
  it('normalizes unit labels on read (normalizeUnitId) and nothing else', () => {
    const wire = workspaceToWire(state()); wire.project.units.moment = 'kN·m'
    expect(workspaceFromWire(wire).project.units.moment).toBe('kNm')
  })
  it('rejects unknown keys, unknown enum labels and wrong types with the full path', () => {
    const wire = JSON.parse(JSON.stringify(workspaceToWire(state())))
    expect(() => parseProjectData(workspaceWireSchema, { ...wire, extra: 1 }, 'workspace')).toThrow(ProjectDataValidationError)
    wire.bridges[2].bridgeType = 'Suspension'
    expect(() => parseProjectData(workspaceWireSchema, wire, 'workspace')).toThrow('workspace.bridges[2].bridgeType')
    wire.bridges[2].bridgeType = 'Precast Girder'; wire.bridges[0].spansM[0] = 'x'
    expect(() => parseProjectData(workspaceWireSchema, wire, 'workspace')).toThrow('workspace.bridges[0].spansM[0]')
  })
  it('toWire rejects a bridge without an id or with a blank id', () => {
    const original = state()
    const missing = { ...original, bridges: [{ ...original.bridges[0], id: undefined }] }
    expect(() => workspaceToWire(missing)).toThrow(WireMappingError)
    expect(() => workspaceToWire(missing)).toThrow('Cannot send project data: bridges[0].id - is required')
    const blank = { ...original, bridges: [original.bridges[0], { ...original.bridges[1], id: '' }] }
    expect(() => workspaceToWire(blank)).toThrow('bridges[1].id - must not be blank')
  })
  it('section definition: path, not clearable, null -> undefined', () => {
    expect(WORKSPACE_SECTION).toMatchObject({ path: 'workspace', codec: { clearable: false } })
    expect(WORKSPACE_SECTION.codec.fromWire(null)).toBeUndefined()
    expect(WORKSPACE_SECTION.codec.schema.safeParse(null).success).toBe(true)
  })
})
