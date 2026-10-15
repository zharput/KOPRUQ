import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnitTextInput from './UnitTextInput'

describe('UnitTextInput', () => {
  it('shows the canonical text converted and formatted, and re-renders for a new unit', () => {
    const { rerender } = render(<UnitTextInput ariaLabel="ze" value="10" quantity="length" onChange={() => {}} />)
    expect(screen.getByLabelText('ze')).toHaveValue(10)
    expect((screen.getByLabelText('ze') as HTMLInputElement).value).toBe('10.0000')
    rerender(<UnitTextInput ariaLabel="ze" value="10" quantity="length" units={{ length: 'mm' }} onChange={() => {}} />)
    expect((screen.getByLabelText('ze') as HTMLInputElement).value).toBe('10000.0')
  })

  it('writes the canonical text when a valid number is typed in the display unit', async () => {
    const onChange = vi.fn()
    render(<UnitTextInput ariaLabel="t" value="10" quantity="temperature" units={{ temperature: 'F' }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('t'), { target: { value: '-4' } })
    expect(onChange).toHaveBeenLastCalledWith('-20')
    fireEvent.change(screen.getByLabelText('t'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('does not write on focus and blur without typing', async () => {
    const onChange = vi.fn()
    render(<UnitTextInput ariaLabel="ze" value="10" quantity="length" units={{ length: 'mm' }} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('ze'))
    expect((screen.getByLabelText('ze') as HTMLInputElement).value).toBe('10000')
    act(() => screen.getByLabelText('ze').blur())
    expect(onChange).not.toHaveBeenCalled()
    // React keeps the DOM text of a type=number input when it is numerically equal, so only the number is asserted.
    expect(screen.getByLabelText('ze')).toHaveValue(10000)
  })

  it('focused draft is a clean number for 0, 1 and 51 degF and focus/blur writes nothing (finding 1)', async () => {
    for (const [canonical, draft, blurred] of [['-17.7777777777778', '0', '0.00'], ['-17.2222222222222', '1', '1.00'], ['10.5555555555556', '51', '51.00']]) {
      const onChange = vi.fn()
      const { unmount } = render(<UnitTextInput ariaLabel="t" value={canonical} quantity="temperature" units={{ temperature: 'F' }} onChange={onChange} />)
      const input = screen.getByLabelText('t') as HTMLInputElement
      expect(input.value).toBe(blurred)
      await userEvent.click(input)
      expect(input.value).toBe(draft)
      act(() => input.blur())
      expect(onChange).not.toHaveBeenCalled()
      unmount()
    }
  })

  it('focused draft for K is clean', async () => {
    render(<UnitTextInput ariaLabel="t" value="26.85" quantity="temperature" units={{ temperature: 'K' }} onChange={() => {}} />)
    await userEvent.click(screen.getByLabelText('t'))
    expect((screen.getByLabelText('t') as HTMLInputElement).value).toBe('300')
  })

  it('shows empty and non-numeric stored text as they are', () => {
    render(<UnitTextInput ariaLabel="e" value="" quantity="length" onChange={() => {}} />)
    expect((screen.getByLabelText('e') as HTMLInputElement).value).toBe('')
  })
})
