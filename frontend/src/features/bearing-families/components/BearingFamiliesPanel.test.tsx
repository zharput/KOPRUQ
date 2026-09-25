import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BearingFamiliesPanel from './BearingFamiliesPanel'
import SystemAssemblyPanel from '../../system-assembly/components/SystemAssemblyPanel'

const storeKey = 'kopruq.project-design-system.bearing-families'
function setRule(label: string, min: number, max: number, delta: number) {
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Min` }), { target: { value: String(min) } })
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Max` }), { target: { value: String(max) } })
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Delta` }), { target: { value: String(delta) } })
}
function createFamily(name: string, base: number) {
  fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: name } })
  setRule('Bearing Length L (mm)', base, base + 100, 50)
  setRule('Bearing Width B (mm)', base, base + 100, 50)
  setRule('Bearing Height H (mm)', base, base + 200, 50)
  fireEvent.click(screen.getByRole('button', { name: 'Add Bearing' }))
}

describe('Bearing family management', () => {
  it('uses the Pier workflow: selects a family, edits it directly, and Add creates an independent copy', () => {
    localStorage.removeItem(storeKey)
    render(<BearingFamiliesPanel />)
    const schematic = document.querySelector('.bearing-schematic-grid')
    expect(schematic?.children).toHaveLength(2)
    expect(schematic?.children[0]).toHaveAttribute('width', '280')
    expect(schematic?.children[1]).toHaveAttribute('width', '280')
    createFamily('B1', 300)
    expect(screen.getByText('Generated Bearing Variants:').parentElement).toHaveTextContent('45')
    fireEvent.click(screen.getByRole('button', { name: 'Add Bearing' }))
    let catalog = JSON.parse(localStorage.getItem(storeKey) ?? '[]') as { id: string; name: string; length: { max: number } }[]
    expect(catalog.map((family) => family.name)).toEqual(['B1', 'B1-COPY'])
    const b1Id = catalog[0].id
    const copyId = catalog[1].id

    const b1Row = screen.getByRole('row', { name: /B1\s/ })
    fireEvent.click(b1Row)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bearing Length L (mm) Max' }), { target: { value: '450' } })
    catalog = JSON.parse(localStorage.getItem(storeKey) ?? '[]') as typeof catalog
    expect(catalog).toHaveLength(2)
    expect(catalog[0]).toMatchObject({ id: b1Id, name: 'B1', length: { max: 450 } })
    expect(catalog[1]).toMatchObject({ id: copyId, name: 'B1-COPY', length: { max: 400 } })

    const copyRow = screen.getByRole('row', { name: /B1-COPY/ })
    fireEvent.click(within(copyRow).getByRole('button', { name: 'Delete' }))
    catalog = JSON.parse(localStorage.getItem(storeKey) ?? '[]') as typeof catalog
    expect(catalog.map((family) => family.name)).toEqual(['B1'])
    expect(catalog[0].id).toBe(b1Id)
  })

  it('feeds enabled valid families from the same persisted catalog to System Assembly', () => {
    localStorage.removeItem(storeKey)
    const { unmount } = render(<BearingFamiliesPanel />)
    createFamily('B1', 300)
    fireEvent.click(screen.getByRole('button', { name: 'Add Bearing' }))
    unmount()

    render(<MemoryRouter><SystemAssemblyPanel /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /BearingCATALOG/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /BearingCATALOG/ }))
    const selector = screen.getByRole('combobox')
    expect(within(selector).getByRole('option', { name: 'B1' })).toBeInTheDocument()
    expect(within(selector).getByRole('option', { name: 'B1-COPY' })).toBeInTheDocument()
    expect(screen.getByText('B1-L300-B300-H300')).toBeInTheDocument()
    const copyId = (JSON.parse(localStorage.getItem(storeKey) ?? '[]') as { id: string; name: string }[]).find((family) => family.name === 'B1-COPY')!.id
    fireEvent.change(selector, { target: { value: copyId } })
    expect(screen.getByText('B1-COPY-L300-B300-H300')).toBeInTheDocument()
  })
})
