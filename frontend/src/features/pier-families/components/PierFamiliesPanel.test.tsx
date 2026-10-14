import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import PierFamiliesPanel from './PierFamiliesPanel'
import { readProjectData, resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

// useFamilyCatalog keeps a module-level snapshot cache; the empty-store test runs first on purpose.
beforeEach(() => resetProjectData())

type StoredPier = { id: string; pierType: string }

describe('Pier families panel storage behaviour', () => {
  it('shows RECT-M for an empty store and writes it on read, as before', () => {
    render(<MemoryRouter><PierFamiliesPanel /></MemoryRouter>)
    expect(screen.getAllByText('RECT-M').length).toBeGreaterThan(0)
    expect(readProjectData<StoredPier[]>('families.PIER')![0].id).toBe('RECT-M')
  })

  it('shows a stored legacy pierType without normalizing it on read', async () => {
    seedProjectData('families.PIER', [{ id: 'LEGACY-1', name: 'LEGACY-1', pierType: 'H_TYPE', enabled: false, dimensions: [], allowedConfigurations: ['SINGLE_COLUMN'], twoColumnSpacing: null, heightApplicability: { minimumHeight: null, preferredHeightMin: null, preferredHeightMax: null, maximumHeight: null }, source: 'PROJECT_DESIGN_SYSTEM' }])
    render(<MemoryRouter><PierFamiliesPanel /></MemoryRouter>)
    expect(await screen.findByText('H_TYPE')).toBeInTheDocument()
    expect(readProjectData<StoredPier[]>('families.PIER')![0]).toMatchObject({ id: 'LEGACY-1', pierType: 'H_TYPE' })
  })
})
