import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MaterialsPanel from './MaterialsPanel'
import { getFamilyRecords, saveFamilyRecords } from '../../family-registry/model/familyRepository'
import { PROJECT_DATA_CHANGED_EVENT } from '../../../shared/project-file/projectDataEvents'

const watchDirty = () => { let count = 0; const on = () => { count++ }; window.addEventListener(PROJECT_DATA_CHANGED_EVENT, on); return { count: () => count, stop: () => window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, on) } }

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
  it('marks the project dirty and updates the repository when a concrete class changes', () => {
    render(<MaterialsPanel />)
    const watcher = watchDirty(); const before = watcher.count()
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'C55/67' } })
    watcher.stop()
    expect(watcher.count()).toBeGreaterThan(before)
    expect(getFamilyRecords<{ id: string; concreteClass: string }>('MATERIAL')[1]).toMatchObject({ id: 'FOUNDATION', concreteClass: 'C55/67' })
  })
  it('does not mark the project dirty when mounted over an up-to-date store', () => {
    const first = render(<MaterialsPanel />); first.unmount()
    const stored = getFamilyRecords('MATERIAL'); expect(stored).toHaveLength(8)
    const watcher = watchDirty(); render(<MaterialsPanel />); watcher.stop()
    expect(watcher.count()).toBe(0)
    expect(getFamilyRecords('MATERIAL')).toEqual(stored)
  })
  it('writes the eight default rows once on the first mount of an empty catalog and marks the project dirty once', () => {
    expect(localStorage.getItem('kopruq.project-design-system.material-assignments')).toBeNull()
    const watcher = watchDirty(); render(<MaterialsPanel />); watcher.stop()
    expect(getFamilyRecords('MATERIAL')).toHaveLength(8)
    expect(watcher.count()).toBe(1)
  })
  it('fills an empty stored list with the default rows through the repository on mount', () => {
    saveFamilyRecords('MATERIAL', [])
    const watcher = watchDirty(); render(<MaterialsPanel />); watcher.stop()
    expect(getFamilyRecords('MATERIAL')).toHaveLength(8)
    expect(watcher.count()).toBe(1)
  })
})
