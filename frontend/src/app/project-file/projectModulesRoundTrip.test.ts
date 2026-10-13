import { describe, expect, it, vi } from 'vitest'
import { applyProjectFile, buildProjectFile, missingModulesMessage, projectFileText, validateProjectFile } from './projectFileService'
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

describe('local data backup when opening a file without modules', () => {
  const legacyFile = () => { const legacy = JSON.parse(projectFileText(buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'Old' }, bridges: [] }, emptyDefs))); delete legacy.modules; return validateProjectFile(legacy) }
  it('backs up non-empty local values under kopruq.backup.<ISO>.<key> before resetting them, and not empty ones', () => {
    localStorage.clear()
    const wind = JSON.stringify(SAMPLE_MODULES.windInputs); localStorage.setItem(PROJECT_MODULES.windInputs.key, wind)
    const result = applyProjectFile(legacyFile())
    const backups = Object.keys(localStorage).filter((key) => key.startsWith('kopruq.backup.'))
    expect(backups).toHaveLength(1)
    expect(backups[0].startsWith('kopruq.backup.')).toBe(true); expect(backups[0].endsWith(`Z.${PROJECT_MODULES.windInputs.key}`)).toBe(true)
    expect(Number.isNaN(Date.parse(backups[0].slice('kopruq.backup.'.length, -`.${PROJECT_MODULES.windInputs.key}`.length)))).toBe(false)
    expect(localStorage.getItem(backups[0])).toBe(wind)
    expect(result.backedUpModules).toEqual(['windInputs'])
    expect(PROJECT_MODULES.windInputs.read()).toBeUndefined()
  })
  it('writes no backup when local values are empty', () => {
    localStorage.clear()
    applyProjectFile(legacyFile())
    expect(Object.keys(localStorage).filter((key) => key.startsWith('kopruq.backup.'))).toEqual([])
  })
  it('uses readable module labels and mentions the backup in the notification text', () => {
    localStorage.clear(); localStorage.setItem(PROJECT_MODULES.seismicInputs.key, JSON.stringify(SAMPLE_MODULES.seismicInputs))
    const message = missingModulesMessage(applyProjectFile(legacyFile()))!
    expect(message).toContain('Girder library'); expect(message).toContain('Preferred span rules'); expect(message).toContain('Seismic inputs'); expect(message).toContain('Traffic LM1')
    expect(message).not.toContain('seismicInputs'); expect(message).toMatch(/backed up/i)
    expect(missingModulesMessage({ missingModules: [], backedUpModules: [] })).toBeUndefined()
  })
})
