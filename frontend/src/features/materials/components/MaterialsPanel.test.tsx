import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MaterialsPanel from './MaterialsPanel'

afterEach(() => { cleanup(); localStorage.clear() })

describe('material assignments', () => {
  it('persists concrete class selections across workspace remounts', () => {
    const first = render(<MaterialsPanel />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'C55/67' } })
    expect(JSON.parse(localStorage.getItem('kopruq.project-design-system.material-assignments') ?? '[]')[0]).toMatchObject({ id: 'DRILLED_PILES', concreteClass: 'C55/67' })
    first.unmount()
    render(<MaterialsPanel />)
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('C55/67')
  })
})
