import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activeProjectSession } from '../../shared/project-store/activeProject'
import { useProjectModule } from '../../shared/project-file/useProjectModule'
import { BearingFamiliesPanel } from '../../features/bearing-families'
import { getFamilyRecords, getPrecastGirderDefinition } from '../../features/family-registry/model/familyRepository'
import { FoundationFamiliesPanel } from '../../features/foundation-families'
import { GirderLibraryPanel } from '../../features/girder-library'
import { PRECAST_DIMENSIONS } from '../../features/girder-library/model/variants'
import { LoadsPanel } from '../../features/loads'
import { MaterialsPanel } from '../../features/materials'
import { PierCapFamiliesPanel } from '../../features/pier-cap-families'
import { PierFamiliesPanel } from '../../features/pier-families'
import { PreferredSpanPanel } from '../../features/preferred-span'
import { INITIAL_PROJECT, readProjectState, readProjectUnits } from '../../features/project/model/projectWorkspace'
import { INITIAL_CROSS_SECTION_VALUES, SuperstructureFamiliesPanel } from '../../features/superstructure-families'
import { CROSS_SECTION_VALUES_MODULE } from '../../features/superstructure-families/model/crossSectionProjectModule'
import { createFakeProjectApi, type FakeProjectApi } from '../../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../test/projectSessionTestUtils'
import { resetProjectData } from '../../test/projectStoreTestUtils'
import { NEW_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'

/**
 * The real defaults of the application (the fallbacks the panels show for a section the project never wrote) must pass the client wire
 * mapping and fake API round trip, and must not be written unless the panel is meant to write them (BACKEND-DB-PERSISTENCE M5c, D9/D14).
 */
let fake: FakeProjectApi
beforeEach(() => { fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake); resetProjectData() })
afterEach(() => cleanup())

const wrap = (node: React.ReactNode) => <MemoryRouter>{node}</MemoryRouter>

describe('fallbacks of unwritten sections', () => {
  it('are the application constants and are not written back by reading', () => {
    resetProjectData()
    expect(readProjectState()).toEqual({ project: INITIAL_PROJECT, bridges: [] })
    expect(readProjectUnits()).toEqual(INITIAL_PROJECT.units)
    expect(getPrecastGirderDefinition('fallback')).toBe('fallback')
    expect(getFamilyRecords('PIER', () => [{ id: 'RECT-M' }])).toEqual([{ id: 'RECT-M' }])
    expect(renderHook(() => useProjectModule(CROSS_SECTION_VALUES_MODULE, INITIAL_CROSS_SECTION_VALUES)).result.current[0]).toBe(INITIAL_CROSS_SECTION_VALUES)
    expect(putRequests(fake)).toHaveLength(0)
  })
})

describe('panels over a project that never wrote their section', () => {
  it.each([
    ['Pier families', () => wrap(<PierFamiliesPanel />)],
    ['Pier cap families', () => wrap(<PierCapFamiliesPanel />)],
    ['Foundation families', () => wrap(<FoundationFamiliesPanel />)],
    ['Bearing families', () => wrap(<BearingFamiliesPanel />)],
    ['Superstructure families', () => wrap(<SuperstructureFamiliesPanel crossSectionValues={INITIAL_CROSS_SECTION_VALUES} setCrossSectionValues={() => undefined} />)],
    ['Loads', () => wrap(<LoadsPanel crossSectionValues={INITIAL_CROSS_SECTION_VALUES} />)],
  ])('%s show their fallback and send no PUT (no write on read)', async (_name, element) => {
    render(element())
    await flushProjectWrites()
    expect(putRequests(fake)).toHaveLength(0)
    expect(activeProjectSession.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })

  it('Pier families show RECT-M while the section stays empty', async () => {
    render(wrap(<PierFamiliesPanel />))
    expect(screen.getByDisplayValue('RECT-M')).toBeInTheDocument()
    expect(getFamilyRecords('PIER')).toEqual([])
  })

  it('Materials send one PUT of the eight default rows through the fake API', async () => {
    render(wrap(<MaterialsPanel />))
    await flushProjectWrites()
    const puts = putRequests(fake, 'families/materials')
    expect(puts).toHaveLength(1)
    expect((puts[0].body as { value: unknown[] }).value).toHaveLength(8)
    expect(activeProjectSession.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })

  it('the Girder library writes its real default dimensions once, unchanged', async () => {
    render(wrap(<GirderLibraryPanel />))
    await flushProjectWrites()
    const puts = putRequests(fake, 'girder-library')
    expect(puts).toHaveLength(1)
    const value = (puts[0].body as { value: { enabled: boolean; dimensions: { key: string; label: string; min: number; max: number; delta: number }[] } }).value
    expect(value.enabled).toBe(false)
    expect(value.dimensions).toEqual(PRECAST_DIMENSIONS.map(({ key, label, min, max, delta }) => ({ key, label, min, max, delta })))
    expect(activeProjectSession.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })

  it('Preferred span sends one PUT of the four generated default rules through the fake API', async () => {
    render(wrap(<PreferredSpanPanel />))
    await flushProjectWrites()
    const puts = putRequests(fake, 'preferred-span-rules')
    expect(puts).toHaveLength(1)
    const value = (puts[0].body as { value: { girderVariantId: string }[] }).value
    expect(value.map((rule) => rule.girderVariantId)).toEqual(['PG-H160', 'PG-H170', 'PG-H180', 'PG-H190'])
    expect(fake.document(NEW_PROJECT_DOCUMENT_JSON.projectId)?.preferredSpanRules).toEqual(value)
    expect(putRequests(fake).filter((request) => !request.path.endsWith('/preferred-span-rules'))).toHaveLength(0)
    expect(activeProjectSession.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })
})
