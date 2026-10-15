import { useState } from 'react'

/**
 * A number edit box that always DISPLAYS 2 decimal places (2026-09-13,
 * engineer's own instruction - "kırmızı işaretli sayılar dışındakilerin
 * hepsi 2 desimalli olsun") without fighting the user while they are
 * actively typing: the raw text they're typing is shown while the field
 * is focused (so "0.1" doesn't snap to "0.10" mid-keystroke and block
 * further typing), and it's reformatted to 2 decimals on blur, or
 * whenever `value` changes from outside (e.g. a cross-feature update)
 * while the field isn't focused.
 *
 * <p>Not used for integer "count" fields (girder count, guardrail/
 * railing/fence/panel counts) - the engineer explicitly excluded those
 * from the 2-decimal rule; those stay plain `<input type="number">`.
 *
 * <p>Deliberately no effect - the displayed value is derived straight
 * from `focused` during render (raw typed text while focused, the
 * formatted `value` otherwise), not synchronized via `useEffect`.
 */
const DEFAULT_FORMAT = (v: number) => v.toFixed(2)

/**
 * `format` (optional) replaces the default 2-decimal display, e.g. for
 * values shown in a converted unit with a unit-dependent precision. It
 * receives the `value` prop as given (already in the displayed unit).
 */
export default function DecimalInput({
  value,
  onChange,
  className = 'spn-input spn-input-number',
  format = DEFAULT_FORMAT,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  format?: (value: number) => string
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(format(value))

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={focused ? text : format(value)}
      onFocus={() => {
        setText(format(value))
        setFocused(true)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const parsed = Number(raw)
        if (raw.trim() !== '' && !Number.isNaN(parsed)) onChange(parsed)
      }}
      onBlur={() => setFocused(false)}
    />
  )
}
