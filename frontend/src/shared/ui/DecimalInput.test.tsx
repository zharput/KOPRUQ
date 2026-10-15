import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DecimalInput from './DecimalInput'

describe('DecimalInput', () => {
  it('shows 2 decimals by default', () => {
    render(<DecimalInput value={0.1} onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('0.10')
  })

  it('uses a custom format for display and focus text, including exponent text', async () => {
    const onChange = vi.fn()
    const sig4 = (v: number) => v.toPrecision(4)
    const { rerender } = render(<DecimalInput value={0.0004079} onChange={onChange} format={sig4} />)
    const box = screen.getByRole('textbox')
    expect(box).toHaveValue('0.0004079')
    rerender(<DecimalInput value={2.4e-8} onChange={onChange} format={sig4} />)
    expect(box).toHaveValue('2.400e-8')
    await userEvent.click(box)
    expect(box).toHaveValue('2.400e-8')
    await userEvent.tab()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('parses typed text, including exponent notation', async () => {
    const onChange = vi.fn()
    render(<DecimalInput value={1} onChange={onChange} format={(v) => v.toFixed(4)} />)
    const box = screen.getByRole('textbox')
    await userEvent.clear(box)
    await userEvent.type(box, '2.4e-8')
    expect(onChange).toHaveBeenLastCalledWith(2.4e-8)
  })
})
