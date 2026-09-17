import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import FoundationFamiliesPanel from './FoundationFamiliesPanel'
import SystemAssemblyPanel from '../../system-assembly/components/SystemAssemblyPanel'

const key = 'spanova.project-design-system.foundation-families'
function setRule(label: string, min: number, max: number, delta: number) {
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Min` }), { target: { value: String(min) } })
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Max` }), { target: { value: String(max) } })
  fireEvent.change(screen.getByRole('spinbutton', { name: `${label} Delta` }), { target: { value: String(delta) } })
}
function beginFamily(name: string) {
  const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
  if (existing.length) fireEvent.click(screen.getByRole('button', { name: 'Add Foundation' }))
  fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: name } })
}
function finishFirstFamily() {
  const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
  if (!existing.length) fireEvent.click(screen.getByRole('button', { name: 'Add Foundation' }))
}
function configureShallow(name: string, max = 8) {
  beginFamily(name)
  setRule('Foundation Length Lx (m)', 4, max, 1)
  setRule('Foundation Width Ly (m)', 4, 8, 2)
  setRule('Foundation Height H (m)', 1, 3, 1)
  finishFirstFamily()
}
function configurePiled(name: string) {
  beginFamily(name)
  fireEvent.change(screen.getByLabelText('Foundation Type'), { target: { value: 'PILED' } })
  setRule('Pile Diameter D (m)', 1.2, 1.2, 0)
  setRule('Pile Count nx', 4, 4, 0)
  setRule('Pile Spacing ax (m)', 3, 3, 0)
  setRule('Pile Count ny', 3, 3, 0)
  setRule('Pile Spacing ay (m)', 3, 3, 0)
  setRule('Foundation Height H (m)', 2, 2, 0)
  expect(screen.getByText(/Lx = 11\.4 m/)).toBeInTheDocument()
  expect(screen.getByText(/Ly = 8\.4 m/)).toBeInTheDocument()
  finishFirstFamily()
}

describe('Foundation families', () => {
  it('selects and edits catalog families directly, and Add Foundation clones the selected family', () => {
    localStorage.removeItem(key)
    render(<FoundationFamiliesPanel />)
    expect(screen.queryByRole('button', { name: /New Foundation/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update Foundation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()

    configureShallow('F1', 8)
    let families = JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string; name: string; shallowGeneration: { lengthX: { max: number } } }[]
    expect(families).toHaveLength(1)
    const originalId = families[0].id
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Foundation Length Lx (m) Max' }), { target: { value: '10' } })
    families = JSON.parse(localStorage.getItem(key) ?? '[]') as typeof families
    expect(families).toHaveLength(1)
    expect(families[0]).toMatchObject({ id: originalId, name: 'F1', shallowGeneration: { lengthX: { max: 10 } } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Foundation' }))
    families = JSON.parse(localStorage.getItem(key) ?? '[]') as typeof families
    expect(families).toHaveLength(2)
    expect(families[1].id).not.toBe(originalId)
    expect(families[1].name).toBe('F1-COPY')
    expect(screen.getByLabelText('Family Name')).toHaveValue('F1-COPY')
    fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'F1-COPY-2' } })
    fireEvent.click(within(screen.getByRole('row', { name: /F1\s/ })).getByRole('button', { name: 'Delete' }))
    families = JSON.parse(localStorage.getItem(key) ?? '[]') as typeof families
    expect(families.map((item) => item.name)).toEqual(['F1-COPY-2'])
  })

  it('retains shallow and piled generation and publishes family catalog entries to Assembly', () => {
    localStorage.removeItem(key)
    const { unmount } = render(<FoundationFamiliesPanel />)
    configureShallow('FS1')
    configurePiled('FP1')
    unmount()

    render(<MemoryRouter><SystemAssemblyPanel /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /Pile System/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /FoundationCATALOG/ }))
    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: 'FS1' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'FP1' })).toBeInTheDocument()
    const fp1 = (JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string; name: string }[]).find((item) => item.name === 'FP1')!
    fireEvent.change(select, { target: { value: fp1.id } })
    expect(screen.getByRole('img', { name: 'PIER engineering schematic' })).toHaveTextContent('PILES')
  })
})
