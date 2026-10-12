import { describe, expect, it, vi } from 'vitest'
import { applyProjectFile, buildProjectFile, projectFileText, validateProjectFile } from './projectFileService'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { exportGraphDocuments } from '../../features/graph/state/graphStore'
import { getFamilyRecords, saveFamilyRecords } from '../../features/family-registry/model/familyRepository'
import { PROJECT_MODULES, PROJECT_MODULE_IDS } from './projectModules'

const SAMPLE_MODULES = {
  girderLibrary: { dimensions: [{ key: 'H', label: 'H (cm)', min: 160, max: 170, delta: 10 }] },
  preferredSpanRules: [{ id: 'girder-span-PG-H160', superstructureType: 'PRECAST_GIRDER', girderVariantId: 'PG-H160', minSpan: 20, maxSpan: 30, spanDelta: 5, primarySpan: 25, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' }],
  seismicInputs: { a: '0.2', g: 'C', t: 'Type 2', i: '1.2' },
  windInputs: { vb: '27', terrain: 'III', ze: '12' },
  temperatureInputs: { min: '-20', max: '40', t0: '10' },
  crossSectionValues: { platformWidthM: 12, leftWalkwayM: 1.1, rightWalkwayM: 1.2, spaceOfGirderM: 2.1, numberOfGirders: 4 },
  selfWeightInputs: { asphaltThicknessM: 0.12, asphaltUnitWeightKNm3: 23, sidewalkThicknessM: 0.2, sidewalkUnitWeightKNm3: 25, faciaCount: 2, faciaWidthM: 0.6, faciaThicknessM: 0.1, faciaUnitWeightKNm3: 25, guardrailCount: 1, guardrailUnitLoadKNm: 2, pedestrianRailingCount: 2, pedestrianRailingUnitLoadKNm: 1.5, protectiveFenceCount: 0, protectiveFenceUnitLoadKNm: 1, soundPanelCount: 1, soundPanelUnitLoadKNm: 1 },
  trafficLm1: { tandemSystem: [], udl: [], remainingAreaUdl: { label: 'Remaining', characteristicValue: { value: 2.5, provenance: 'CODE_DEFAULT', codeDefaultValue: 2.5 }, adjustmentFactor: { value: 0.8, provenance: 'PROJECT_OVERRIDE', codeDefaultValue: 1 } } },
} as const
const emptyState = { project: { ...INITIAL_PROJECT, name: 'Modules' }, bridges: [] }
const emptyDefs = { selectedBridgeId: null, definitions: {} }
const writeSamples = () => { for (const id of PROJECT_MODULE_IDS) (PROJECT_MODULES[id] as { write(v: unknown): boolean }).write(SAMPLE_MODULES[id]) }

describe('project modules in the project file', () => {
  it('round-trips all eight project modules through the project file', () => {
    localStorage.clear(); writeSamples()
    const json = projectFileText(buildProjectFile(emptyState, emptyDefs))
    expect(Object.keys(JSON.parse(json).modules).sort()).toEqual([...PROJECT_MODULE_IDS].sort())
    localStorage.clear(); const result = applyProjectFile(validateProjectFile(JSON.parse(json)))
    expect(result.missingModules).toEqual([])
    for (const id of PROJECT_MODULE_IDS) expect(PROJECT_MODULES[id].read()).toEqual(SAMPLE_MODULES[id])
  })
  it('does not leak module values of project A into a module-less project B', () => {
    localStorage.clear(); writeSamples()
    const legacy = JSON.parse(projectFileText(buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'B' }, bridges: [] }, emptyDefs))); delete legacy.modules
    const result = applyProjectFile(validateProjectFile(legacy))
    expect([...result.missingModules].sort()).toEqual([...PROJECT_MODULE_IDS].sort())
    for (const id of PROJECT_MODULE_IDS) if (id !== 'girderLibrary') expect(PROJECT_MODULES[id].read()).toBeUndefined()
    expect(localStorage.getItem('kopruq.girder-library.precast')).toBe('[]')
  })
  it('restores previous modules, graph and families when a module write fails during apply', () => {
    localStorage.clear(); writeSamples()
    const previousGraph = JSON.stringify(exportGraphDocuments()); saveFamilyRecords('PIER', [{ id: 'old-pier', name: 'Old' }])
    const incoming = JSON.parse(projectFileText(buildProjectFile(emptyState, emptyDefs)))
    incoming.modules = { ...incoming.modules, seismicInputs: { a: '9', g: 'A', t: 'Type 1', i: '1' }, windInputs: { vb: '99', terrain: 'I', ze: '1' } }
    incoming.families.PIER = [{ id: 'new-pier', name: 'New' }]
    const real = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) { if (key === 'kopruq.wind-load.inputs') throw new Error('quota'); return real.call(this, key, value) })
    expect(() => applyProjectFile(validateProjectFile(incoming))).toThrow(); spy.mockRestore()
    expect(PROJECT_MODULES.seismicInputs.read()).toEqual(SAMPLE_MODULES.seismicInputs)
    expect(PROJECT_MODULES.windInputs.read()).toEqual(SAMPLE_MODULES.windInputs)
    expect(getFamilyRecords('PIER')).toEqual([{ id: 'old-pier', name: 'Old' }]); expect(JSON.stringify(exportGraphDocuments())).toBe(previousGraph)
  })
})
