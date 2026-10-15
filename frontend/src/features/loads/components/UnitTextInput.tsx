import { useState } from 'react'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { canonicalText, displayText, formatLoadValue, type LoadQuantity } from '../model/loadUnits'

/**
 * Text-valued number box for the Wind/Temperature inputs, whose stored
 * value is a CANONICAL text (ze in m, temperatures in deg C) but which the
 * engineer reads and types in the project's unit. While focused the draft
 * the user types is shown untouched; otherwise the stored value is shown
 * converted and formatted with the Loads rounding rule. A valid number (or
 * an empty box) writes the canonical text through `onChange`; entering and
 * leaving the box without typing never writes anything.
 */
export default function UnitTextInput({
  value,
  onChange,
  quantity,
  units,
  className = 'spn-input',
  ariaLabel,
}: {
  value: string
  onChange: (canonical: string) => void
  quantity: LoadQuantity
  units?: ProjectUnits
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const n = Number(value)
  const shown = focused && draft !== null
    ? draft
    : value.trim() === '' || !Number.isFinite(n) ? value : formatLoadValue(n, quantity, units)

  return (
    <input
      className={className}
      type="number"
      aria-label={ariaLabel}
      value={shown}
      onFocus={() => { setDraft(displayText(value, quantity, units)); setFocused(true) }}
      onBlur={() => { setDraft(null); setFocused(false) }}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const canonical = canonicalText(raw, quantity, units)
        if (canonical !== null) onChange(canonical)
      }}
    />
  )
}
