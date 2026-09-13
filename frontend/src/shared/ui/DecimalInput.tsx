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
export default function DecimalInput({
  value,
  onChange,
  className = 'spn-input spn-input-number',
}: {
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(value.toFixed(2))

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={focused ? text : value.toFixed(2)}
      onFocus={() => {
        setText(value.toFixed(2))
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
