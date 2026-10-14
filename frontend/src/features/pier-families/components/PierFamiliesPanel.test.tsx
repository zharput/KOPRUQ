import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import PierFamiliesPanel from './PierFamiliesPanel'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { useBeforeUnloadWarning } from '../../../app/project-session/useBeforeUnloadWarning'
import { createFakeProjectApi, type FakeProjectApi } from '../../../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../../test/projectSessionTestUtils'
import { readProjectData, resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'
import { getFamilies } from '../../family-registry/model/registry'

let fake: FakeProjectApi
beforeEach(() => { fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake); resetProjectData() })

type StoredPier = { id: string; pierType: string }

describe('Pier families panel storage behaviour', () => {
  it('shows RECT-M for an empty section without writing it (no write on read)', async () => {
    render(<MemoryRouter><PierFamiliesPanel /></MemoryRouter>)
    expect(screen.getByDisplayValue('RECT-M')).toBeInTheDocument()
    expect(screen.getByText('Henüz projeye kaydedilmedi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Pier' })).toBeDisabled()
    expect(getFamilies('PIER')).toEqual([])
    expect(readProjectData<StoredPier[]>('families.PIER')).toBeNull()
    await flushProjectWrites()
    expect(putRequests(fake)).toHaveLength(0)
  })

  it('keeps edits to the starter draft local until a valid family is added', async () => {
    const { container } = render(<MemoryRouter><PierFamiliesPanel /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'My Pier' } })
    expect(screen.getByDisplayValue('My Pier')).toBeInTheDocument()
    await flushProjectWrites()
    expect(putRequests(fake)).toHaveLength(0)
    expect(getFamilies('PIER')).toEqual([])

    const heights = container.querySelectorAll<HTMLInputElement>('.pier-height-applicability-grid input')
    expect(heights).toHaveLength(4)
    ;['0', '1', '2', '3'].forEach((value, index) => fireEvent.change(heights[index], { target: { value } }))
    const add = screen.getByRole('button', { name: 'Add Pier' })
    expect(add).toBeEnabled()
    await flushProjectWrites()
    expect(putRequests(fake)).toHaveLength(0)
    fireEvent.click(add)
    await flushProjectWrites()

    const saved = readProjectData<StoredPier[]>('families.PIER')
    expect(saved).toHaveLength(1)
    expect(saved?.[0]).toMatchObject({ name: 'My Pier', pierType: 'RECTANGULAR', heightApplicability: { minimumHeight: 0, preferredHeightMin: 1, preferredHeightMax: 2, maximumHeight: 3 } })
    expect(saved?.[0].id).not.toBe('RECT-M')
    expect(getFamilies('PIER')).toMatchObject([{ name: 'My Pier' }])
    expect(putRequests(fake, 'families/piers')).toHaveLength(1)
    expect(screen.queryByText('Henüz projeye kaydedilmedi')).not.toBeInTheDocument()
  })

  it('shows a stored legacy pierType without normalizing it on read', async () => {
    seedProjectData('families.PIER', [{ id: 'LEGACY-1', name: 'LEGACY-1', pierType: 'H_TYPE', enabled: false, dimensions: [], allowedConfigurations: ['SINGLE_COLUMN'], twoColumnSpacing: null, heightApplicability: { minimumHeight: null, preferredHeightMin: null, preferredHeightMax: null, maximumHeight: null }, source: 'PROJECT_DESIGN_SYSTEM' }])
    render(<MemoryRouter><PierFamiliesPanel /></MemoryRouter>)
    expect(await screen.findByText('H_TYPE')).toBeInTheDocument()
    expect(screen.queryByText('Henüz projeye kaydedilmedi')).not.toBeInTheDocument()
    expect(readProjectData<StoredPier[]>('families.PIER')![0]).toMatchObject({ id: 'LEGACY-1', pierType: 'H_TYPE' })
  })

  describe('unsaved starter draft', () => {
    const Harness = () => { useBeforeUnloadWarning(); return <PierFamiliesPanel /> }
    const unloadPrevented = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented }

    it('asks before the tab closes only while the draft holds edits', async () => {
      const { unmount } = render(<MemoryRouter><Harness /></MemoryRouter>)
      expect(unloadPrevented()).toBe(false)
      fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'My Pier' } })
      expect(unloadPrevented()).toBe(true)
      unmount()
      expect(unloadPrevented()).toBe(false)
    })

    it('stops asking once the draft is added to the catalog', async () => {
      const { container } = render(<MemoryRouter><Harness /></MemoryRouter>)
      fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'My Pier' } })
      container.querySelectorAll<HTMLInputElement>('.pier-height-applicability-grid input').forEach((input, index) => fireEvent.change(input, { target: { value: String(index) } }))
      expect(unloadPrevented()).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Add Pier' }))
      await flushProjectWrites()
      expect(unloadPrevented()).toBe(false)
    })

    it('does not ask when the edit is reverted to the starter values', () => {
      render(<MemoryRouter><Harness /></MemoryRouter>)
      const name = screen.getByLabelText('Family Name')
      fireEvent.change(name, { target: { value: 'My Pier' } })
      expect(unloadPrevented()).toBe(true)
      fireEvent.change(name, { target: { value: 'RECT-M' } })
      expect(unloadPrevented()).toBe(false)
    })

    it('starts again from the starter after the added family is deleted', async () => {
      const { container } = render(<MemoryRouter><Harness /></MemoryRouter>)
      fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'My Pier' } })
      container.querySelectorAll<HTMLInputElement>('.pier-height-applicability-grid input').forEach((input, index) => fireEvent.change(input, { target: { value: String(index) } }))
      fireEvent.click(screen.getByRole('button', { name: 'Add Pier' }))
      await flushProjectWrites()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      await flushProjectWrites()
      expect(getFamilies('PIER')).toEqual([])
      expect(screen.getByLabelText('Family Name')).toHaveValue('RECT-M')
      expect(unloadPrevented()).toBe(false)
    })
  })
})
