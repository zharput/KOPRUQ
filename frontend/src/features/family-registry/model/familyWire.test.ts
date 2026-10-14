import { describe, expect, it } from 'vitest'
import { PRECAST_DIMENSIONS } from '../../girder-library/model/variants'
import { parseProjectData, WireMappingError } from '../../../shared/project-store/projectDataValidation'
import {
  FAMILY_SECTIONS, GIRDER_LIBRARY_SECTION, bearingFamiliesFromWire, bearingFamiliesToWire, familiesWireSchema, foundationFamiliesFromWire, foundationFamiliesToWire,
  girderLibraryFromWire, girderLibraryToWire, girderLibraryWireSchema, materialAssignmentsFromWire, materialAssignmentsToWire, pierCapFamiliesFromWire, pierCapFamiliesToWire,
  pierFamiliesFromWire, pierFamiliesToWire, pierFamilyWireSchema,
  type BearingFamilyRecord, type FoundationFamilyRecord, type MaterialAssignmentRecord, type PierCapFamilyRecord, type PierFamilyRecord,
} from './familyWire'

const rule = (min: number, max: number, delta: number) => ({ min, max, delta })
const dim = (key: string, label: string, min: number, max: number, delta: number) => ({ key, label, min, max, delta })

const PIERS: PierFamilyRecord[] = [
  {
    id: 'pier-circ', name: 'Circular', pierType: 'CIRCULAR', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', dimensions: [dim('D', 'D (m)', 1.2, 1.8, 0.2)],
    allowedConfigurations: ['SINGLE_COLUMN', 'TWO_COLUMNS'], twoColumnSpacing: dim('S', 'Spacing (m)', 4, 6, 1),
    heightApplicability: { minimumHeight: 5, preferredHeightMin: 8, preferredHeightMax: 20, maximumHeight: 30 },
  },
  { id: 'pier-legacy', name: 'Legacy', pierType: 'H_TYPE', enabled: false, source: 'PROJECT_DESIGN_SYSTEM', dimensions: [], allowedConfigurations: [], twoColumnSpacing: null, heightApplicability: { minimumHeight: null, preferredHeightMin: null, preferredHeightMax: null, maximumHeight: null } },
  { id: 'pier-wall', pierType: 'WALL', twoColumnSpacing: null },
]
const CAPS: PierCapFamilyRecord[] = [
  { id: 'cap-t', name: 'T cap', capType: 'T_CAP', compatiblePierConfiguration: 'SINGLE_COLUMN', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', capTransverseLength: rule(8, 10, 1), capStructuralHeight: rule(1.5, 2, 0.5), stemWidth: rule(1, 1.2, 0.2) },
  { id: 'cap-r', name: 'Rect cap', capType: 'RECTANGULAR', compatiblePierConfiguration: 'TWO_COLUMNS', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', capTransverseLength: { min: 8, max: null, delta: null }, capStructuralHeight: rule(1, 1, 0), stemWidth: null },
]
const FOUNDATIONS: FoundationFamilyRecord[] = [
  { id: 'fnd-shallow', name: 'Shallow', foundationType: 'SHALLOW', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', shallowGeneration: { lengthX: rule(4, 6, 1), lengthY: rule(4, 6, 1), height: rule(1.5, 2, 0.5) }, piledGeneration: null },
  { id: 'fnd-piled', name: 'Piled', foundationType: 'PILED', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', shallowGeneration: null, piledGeneration: { pileDiameter: rule(1, 1.2, 0.2), pileCountX: rule(2, 3, 1), pileSpacingX: rule(3, 3, 0), pileCountY: rule(2, 3, 1), pileSpacingY: rule(3, 3, 0), height: rule(1.5, 2, 0.5) } },
]
const BEARINGS: BearingFamilyRecord[] = [{ id: 'brg-1', name: 'Elastomeric', bearingType: 'ELASTOMERIC', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', length: rule(300, 500, 50), width: rule(400, 600, 50), height: rule(40, 80, 10) }]
const MATERIALS: MaterialAssignmentRecord[] = [{ id: 'FOUNDATION', no: 2, element: 'Foundation', concreteClass: 'C30/37' }, { id: 'bare' }]

describe('family wire mapping', () => {
  it('round-trips full records of all five categories (T -> W -> T), including the legacy H_TYPE and WALL', () => {
    expect(pierFamiliesFromWire(pierFamiliesToWire(PIERS))).toEqual(PIERS)
    expect(pierCapFamiliesFromWire(pierCapFamiliesToWire(CAPS))).toEqual(CAPS)
    expect(foundationFamiliesFromWire(foundationFamiliesToWire(FOUNDATIONS))).toEqual(FOUNDATIONS)
    expect(bearingFamiliesFromWire(bearingFamiliesToWire(BEARINGS))).toEqual(BEARINGS)
    expect(materialAssignmentsFromWire(materialAssignmentsToWire(MATERIALS))).toEqual(MATERIALS)
  })
  it('a missing optional field is sent as null and comes back as null for the four nullable-by-type fields, omitted otherwise', () => {
    const wire = pierFamiliesToWire([{ id: 'x' }])
    expect(wire[0]).toEqual({ id: 'x', name: null, pierType: null, enabled: null, source: null, dimensions: null, allowedConfigurations: null, twoColumnSpacing: null, heightApplicability: null })
    expect(pierFamiliesFromWire(wire)).toEqual([{ id: 'x', twoColumnSpacing: null }])
    expect(pierCapFamiliesFromWire(pierCapFamiliesToWire([{ id: 'c' }]))).toEqual([{ id: 'c', stemWidth: null }])
    expect(foundationFamiliesFromWire(foundationFamiliesToWire([{ id: 'f' }]))).toEqual([{ id: 'f', shallowGeneration: null, piledGeneration: null }])
    expect(bearingFamiliesFromWire(bearingFamiliesToWire([{ id: 'b' }]))).toEqual([{ id: 'b' }])
  })
  it('emits keys in the backend record order, drops passthrough fields and changes no number', () => {
    const [pier] = pierFamiliesToWire([{ ...PIERS[0], extra: 'x' } as PierFamilyRecord])
    expect(Object.keys(pier)).toEqual(['id', 'name', 'pierType', 'enabled', 'source', 'dimensions', 'allowedConfigurations', 'twoColumnSpacing', 'heightApplicability'])
    expect(Object.keys(pier.dimensions?.[0] as object)).toEqual(['key', 'label', 'min', 'max', 'delta'])
    expect(Object.keys(pier.heightApplicability as object)).toEqual(['minimumHeight', 'preferredHeightMin', 'preferredHeightMax', 'maximumHeight'])
    expect(JSON.stringify(pier)).not.toContain('extra')
    expect(Object.keys(pierCapFamiliesToWire(CAPS)[0])).toEqual(['id', 'name', 'capType', 'compatiblePierConfiguration', 'enabled', 'source', 'capTransverseLength', 'capStructuralHeight', 'stemWidth'])
    expect(Object.keys(pierCapFamiliesToWire(CAPS)[0].capTransverseLength as object)).toEqual(['min', 'max', 'delta'])
    expect(Object.keys(foundationFamiliesToWire(FOUNDATIONS)[0])).toEqual(['id', 'name', 'foundationType', 'enabled', 'source', 'shallowGeneration', 'piledGeneration'])
    expect(Object.keys(foundationFamiliesToWire(FOUNDATIONS)[0].shallowGeneration as object)).toEqual(['lengthX', 'lengthY', 'height'])
    expect(Object.keys(foundationFamiliesToWire(FOUNDATIONS)[1].piledGeneration as object)).toEqual(['pileDiameter', 'pileCountX', 'pileSpacingX', 'pileCountY', 'pileSpacingY', 'height'])
    expect(Object.keys(bearingFamiliesToWire(BEARINGS)[0])).toEqual(['id', 'name', 'bearingType', 'enabled', 'source', 'length', 'width', 'height'])
    expect(Object.keys(materialAssignmentsToWire(MATERIALS)[0])).toEqual(['id', 'no', 'element', 'concreteClass'])
    expect(bearingFamiliesToWire(BEARINGS)[0].length).toEqual({ min: 300, max: 500, delta: 50 })
  })
  it('toWire rejects a record without an id or with a blank id, and a generation rule that is missing', () => {
    expect(() => pierFamiliesToWire([{} as PierFamilyRecord])).toThrow('Cannot send project data: [0].id - is required')
    expect(() => materialAssignmentsToWire([{ id: 'a' }, { id: ' ' }])).toThrow('[1].id - must not be blank')
    const broken = [{ id: 'f', shallowGeneration: { lengthX: rule(1, 2, 1), height: rule(1, 2, 1) } }] as unknown as FoundationFamilyRecord[]
    expect(() => foundationFamiliesToWire(broken)).toThrow(WireMappingError)
    expect(() => foundationFamiliesToWire(broken)).toThrow('[0].shallowGeneration.lengthY - is required')
  })
  it('strict schemas accept H_TYPE and WALL and reject unknown keys and enums with the full path', () => {
    const wire = JSON.parse(JSON.stringify(pierFamiliesToWire(PIERS)))
    expect(parseProjectData(familiesWireSchema, { piers: wire, pierCaps: null, foundations: null, bearings: null, materials: null }, 'families').piers).toHaveLength(3)
    wire[1].pierType = 'ROUND'
    expect(() => parseProjectData(familiesWireSchema, { piers: wire, pierCaps: null, foundations: null, bearings: null, materials: null }, 'families')).toThrow('families.piers[1].pierType')
    wire[1].pierType = 'H_TYPE'; wire[0].extra = 1
    expect(() => parseProjectData(pierFamilyWireSchema.array(), wire, 'value')).toThrow('Invalid project data: value[0]')
    expect(() => parseProjectData(familiesWireSchema, { piers: null, pierCaps: null, foundations: null, bearings: null }, 'families')).toThrow('families.materials')
  })
  it('keeps null and [] apart for every family section', () => {
    for (const category of ['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL'] as const) {
      const codec = FAMILY_SECTIONS[category].codec as { fromWire(w: unknown): unknown }
      expect(codec.fromWire(null)).toBeUndefined(); expect(codec.fromWire([])).toEqual([])
    }
    expect(PIERS_SECTION_PATHS()).toEqual(['families/piers', 'families/pier-caps', 'families/foundations', 'families/bearings', 'families/materials'])
    expect(Object.values(FAMILY_SECTIONS).every((s) => s.codec.clearable === false)).toBe(true)
  })
})

function PIERS_SECTION_PATHS() { return Object.values(FAMILY_SECTIONS).map((s) => s.path) }

describe('girder library wire mapping', () => {
  it('round-trips { enabled, dimensions: PRECAST_DIMENSIONS }', () => {
    const value = { enabled: true, dimensions: PRECAST_DIMENSIONS }
    const wire = girderLibraryToWire(value)
    expect(Object.keys(wire as object)).toEqual(['enabled', 'dimensions'])
    expect(parseProjectData(girderLibraryWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(girderLibraryFromWire(wire)).toEqual(value)
  })
  it('the legacy reset [] maps to null and null maps to undefined', () => {
    expect(girderLibraryToWire([])).toBeNull(); expect(girderLibraryToWire([1, 2])).toBeNull(); expect(girderLibraryFromWire(null)).toBeUndefined()
  })
  it('sends missing members as explicit nulls and omits null members on read', () => {
    expect(girderLibraryToWire({})).toEqual({ enabled: null, dimensions: null })
    expect(girderLibraryFromWire({ enabled: null, dimensions: null })).toEqual({})
    expect(girderLibraryFromWire({ enabled: false, dimensions: null })).toEqual({ enabled: false })
    expect(girderLibraryFromWire(girderLibraryToWire({ dimensions: [] }))).toEqual({ dimensions: [] })
  })
  it('section definition is clearable at girder-library', () => {
    expect(GIRDER_LIBRARY_SECTION).toMatchObject({ path: 'girder-library', codec: { clearable: true } })
    expect(() => parseProjectData(girderLibraryWireSchema, { enabled: true, dimensions: null, extra: 1 }, 'girderLibrary')).toThrow('girderLibrary')
  })
})
