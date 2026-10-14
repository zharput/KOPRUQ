import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import MaterialsPanel from './MaterialsPanel'
import { getFamilyRecords, saveFamilyRecords } from '../../family-registry/model/familyRepository'
import { activeWriteQueue } from '../../../shared/project-store/activeProject'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { createFakeProjectApi, type FakeProjectApi } from '../../../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../../test/projectSessionTestUtils'
import { readProjectData, resetProjectData } from '../../../test/projectStoreTestUtils'

let fake: FakeProjectApi
const materialPuts = () => putRequests(fake, 'families/materials')

beforeEach(() => { fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake) })
afterEach(() => { cleanup(); resetProjectData() })

describe('material assignments', () => {
  it('keeps concrete class selections across workspace remounts', () => {
    const first = render(<MaterialsPanel />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'C55/67' } })
    expect((readProjectData<Record<string, unknown>[]>('families.MATERIAL') ?? [])[0]).toMatchObject({ id: 'DRILLED_PILES', concreteClass: 'C55/67' })
    first.unmount()
    render(<MaterialsPanel />)
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('C55/67')
  })
  it('sends one more PUT and updates the repository when a concrete class changes', async () => {
    render(<MaterialsPanel />)
    await flushProjectWrites()
    const before = materialPuts().length
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'C55/67' } })
    await flushProjectWrites()
    expect(materialPuts().length).toBe(before + 1)
    expect(getFamilyRecords<{ id: string; concreteClass: string }>('MATERIAL')[1]).toMatchObject({ id: 'FOUNDATION', concreteClass: 'C55/67' })
  })
  it('shows discarded values and does not send them with a later edit', async () => {
    render(<MaterialsPanel />)
    await flushProjectWrites()
    const before = materialPuts().length
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'C55/67' } })
    await act(async () => { activeWriteQueue.discard() })
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('C30/37')
    await flushProjectWrites()
    expect(materialPuts()).toHaveLength(before)

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'C55/67' } })
    await flushProjectWrites()
    expect(materialPuts()).toHaveLength(before + 1)
    const value = materialPuts().at(-1)?.body as { value: { concreteClass: string }[] }
    expect(value.value[0].concreteClass).toBe('C30/37')
    expect(value.value[1].concreteClass).toBe('C55/67')
  })
  it('sends no PUT when mounted over an up-to-date section', async () => {
    const first = render(<MaterialsPanel />); first.unmount()
    await flushProjectWrites()
    const stored = getFamilyRecords('MATERIAL'); expect(stored).toHaveLength(8)
    const puts = materialPuts().length
    render(<MaterialsPanel />)
    await flushProjectWrites()
    expect(materialPuts().length).toBe(puts)
    expect(getFamilyRecords('MATERIAL')).toEqual(stored)
  })
  it('writes the eight default rows once on the first mount of an empty catalog', async () => {
    expect(readProjectData('families.MATERIAL')).toBeNull()
    render(<MaterialsPanel />)
    await flushProjectWrites()
    expect(getFamilyRecords('MATERIAL')).toHaveLength(8)
    expect(materialPuts()).toHaveLength(1)
  })
  it('fills an empty stored list with the default rows through the repository on mount', async () => {
    saveFamilyRecords('MATERIAL', [])
    render(<MaterialsPanel />)
    await flushProjectWrites()
    expect(getFamilyRecords('MATERIAL')).toHaveLength(8)
    expect(materialPuts()).toHaveLength(1)
    expect((materialPuts()[0].body as { value: unknown[] }).value).toHaveLength(8)
  })
})
