import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EditableNumericInput from './EditableNumericInput'

describe('editable numeric input buffer', () => {
  it('supports select-all replacement and commits once on Enter', async () => {
    const user = userEvent.setup(), onCommit = vi.fn()
    render(<EditableNumericInput value={12} ariaLabel="Number value" onCommit={onCommit} />)
    const input = screen.getByRole('textbox', { name: 'Number value' })
    expect(input).toHaveClass('nowheel', 'nopan')
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}{Backspace}15.5{Enter}')
    expect(input).toHaveValue('15.5')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(15.5)
  })

  it('retains an empty blurred editor as invalid without converting it to zero', async () => {
    const user = userEvent.setup(), onCommit = vi.fn()
    render(<><EditableNumericInput value={12} ariaLabel="Number value" onCommit={onCommit} /><button>Elsewhere</button></>)
    const input = screen.getByRole('textbox', { name: 'Number value' })
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}{Backspace}')
    expect(input).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onCommit).toHaveBeenCalledWith('')
  })

  it('rejects decimal text in Integer editors and contains canvas shortcut propagation', async () => {
    const user = userEvent.setup(), onCommit = vi.fn(), parentKey = vi.fn()
    render(<div onKeyDown={parentKey}><EditableNumericInput value={12} integer ariaLabel="Integer value" onCommit={onCommit} /></div>)
    const input = screen.getByRole('textbox', { name: 'Integer value' })
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}2.5{Enter}')
    expect(input).toHaveValue('2.5')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onCommit).toHaveBeenCalledWith('2.5')
    expect(parentKey).not.toHaveBeenCalled()
  })
})
