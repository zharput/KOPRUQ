import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CanvasSelect from './CanvasSelect'
import { EN_CONCRETE_CLASS_IDS } from '../../materials/model/materialCatalog'

function renderConcrete(value = 'C40/50') {
  const onChange = vi.fn()
  render(<CanvasSelect items={EN_CONCRETE_CLASS_IDS} value={value} getKey={item => item} getLabel={item => item} onChange={onChange} ariaLabel="Concrete Class" />)
  return onChange
}

describe('CanvasSelect', () => {
  it('shows the shared 14-grade catalog in a portal and commits the clicked grade', async () => {
    const user = userEvent.setup(), onChange = renderConcrete()
    await user.click(screen.getByRole('button', { name: 'Concrete Class' }))
    const menu = screen.getByRole('listbox', { name: 'Concrete Class' })
    expect(menu.parentElement).toBe(document.body)
    expect(screen.getAllByRole('option')).toHaveLength(14)
    expect(screen.getByRole('option', { name: 'C40/50' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: 'C35/45' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('C35/45')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard open, navigation, commit, Escape and outside dismissal', async () => {
    const user = userEvent.setup(), onChange = renderConcrete()
    const trigger = screen.getByRole('button', { name: 'Concrete Class' })
    trigger.focus(); await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith('C45/55')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(trigger); await user.keyboard('{Escape}')
    expect(onChange).toHaveBeenCalledTimes(1)
    await user.click(trigger); fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('routes wheel and pointer gestures through UI controls instead of the graph canvas', async () => {
    const user = userEvent.setup(), onChange = renderConcrete()
    const graph = document.createElement('div')
    document.body.append(graph)
    const wheel = vi.fn(), pointer = vi.fn()
    graph.addEventListener('wheel', wheel)
    graph.addEventListener('pointerdown', pointer)
    await user.click(screen.getByRole('button', { name: 'Concrete Class' }))
    const option = screen.getByRole('option', { name: 'C12/15' })
    fireEvent.wheel(option, { deltaY: 30 })
    fireEvent.pointerDown(option)
    expect(wheel).not.toHaveBeenCalled()
    expect(pointer).not.toHaveBeenCalled()
    graph.remove()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lets a closed selector wheel bubble to React Flow so it can zoom', () => {
    const graph = document.createElement('div')
    document.body.append(graph)
    render(<CanvasSelect items={EN_CONCRETE_CLASS_IDS} value="C40/50" getKey={item => item} getLabel={item => item} onChange={vi.fn()} ariaLabel="Concrete Class" />, { container: graph })
    const wheel = vi.fn()
    graph.addEventListener('wheel', wheel)
    fireEvent.wheel(screen.getByRole('button', { name: 'Concrete Class' }), { deltaY: 30 })
    expect(wheel).toHaveBeenCalledOnce()
    graph.remove()
  })
})
