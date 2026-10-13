import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import PierFamiliesPanel from '../../features/pier-families/components/PierFamiliesPanel'
import PierCapFamiliesPanel from '../../features/pier-cap-families/components/PierCapFamiliesPanel'
import FoundationFamiliesPanel from '../../features/foundation-families/components/FoundationFamiliesPanel'
import BearingFamiliesPanel from '../../features/bearing-families/components/BearingFamiliesPanel'
import MaterialsPanel from '../../features/materials/components/MaterialsPanel'
import { buildProjectFile, projectFileText, readProjectFile, validateProjectFile } from './projectFileService'
import { getFamilyRecords } from '../../features/family-registry/model/familyRepository'
import { ensureBridgeDefinitions } from '../../features/bridge-definition/model/store'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { INITIAL_BRIDGES } from '../../features/project/model/types'

beforeEach(() => localStorage.clear())

describe('files written from the application real defaults pass validation (AC8)', () => {
  it('validates INITIAL_BRIDGES, their definitions and the catalogs the family panels create on first use', async () => {
    for (const Panel of [PierFamiliesPanel, PierCapFamiliesPanel, FoundationFamiliesPanel, BearingFamiliesPanel, MaterialsPanel]) render(<Panel />)
    for (const category of ['PIER', 'MATERIAL'] as const) expect(getFamilyRecords(category).length).toBeGreaterThan(0)
    const bridges = INITIAL_BRIDGES.map((bridge, index) => ({ ...bridge, id: `b-${index}` }))
    const definitions = ensureBridgeDefinitions({ selectedBridgeId: null, definitions: {} }, bridges)
    const json = JSON.parse(projectFileText(buildProjectFile({ project: INITIAL_PROJECT, bridges }, definitions)))
    expect(() => validateProjectFile(json)).not.toThrow()
    const read = await readProjectFile(new File([JSON.stringify(json)], 'defaults.kopruq'))
    expect(read.projectState.bridges).toHaveLength(INITIAL_BRIDGES.length)
    expect(Object.keys(read.bridgeDefinitions.definitions)).toEqual(INITIAL_BRIDGES.map((bridge) => bridge.no))
  })
})
