import { useEffect, useRef, useState } from 'react'
import type { GraphParameterValue } from '../domain/types'

export default function EditableNumericInput({ value, integer = false, ariaLabel, disabled = false, onCommit }: { value: GraphParameterValue | undefined; integer?: boolean; ariaLabel: string; disabled?: boolean; onCommit: (value: number | string) => void }) {
  const committedText = typeof value === 'number' || typeof value === 'string' ? String(value) : ''
  const [draft, setDraft] = useState(committedText)
  const [focused, setFocused] = useState(false)
  const [invalid, setInvalid] = useState(typeof value === 'string')
  const lastCommit = useRef<string | undefined>(undefined)
  const lastCommittedText = useRef(committedText)

  useEffect(() => {
    if (!focused && document.activeElement !== document.querySelector(`[aria-label="${ariaLabel}"]`)) {
      if (lastCommittedText.current !== committedText || typeof value === 'string') {
        setDraft(committedText)
        setInvalid(typeof value === 'string')
        lastCommittedText.current = committedText
        lastCommit.current = undefined
      }
    }
  }, [ariaLabel, committedText, focused, value])

  const commitDraft = () => {
    if (lastCommit.current === draft) return
    lastCommit.current = draft
    const text = draft.trim()
    const validSyntax = integer ? /^-?\d+$/.test(text) : /^-?(?:\d+\.?\d*|\.\d+)$/.test(text)
    const parsed = validSyntax ? Number(text) : Number.NaN
    if (!text || !Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
      setInvalid(true)
      onCommit(draft)
      return
    }
    setInvalid(false)
    onCommit(parsed)
  }

  return <input
    className={`spn-graph-editable-number nodrag${invalid ? ' is-invalid' : ''}`}
    aria-label={ariaLabel}
    aria-invalid={invalid}
    disabled={disabled}
    inputMode={integer ? 'numeric' : 'decimal'}
    type="text"
    value={draft}
    onFocus={() => setFocused(true)}
    onChange={event => { setDraft(event.target.value); setInvalid(false); lastCommit.current = undefined }}
    onBlur={() => { commitDraft(); setFocused(false) }}
    onKeyDown={event => {
      // Preserve native editing/copy shortcuts while keeping React Flow's canvas shortcuts away.
      event.stopPropagation()
      if (event.key === 'Enter') { event.preventDefault(); commitDraft() }
      if (event.key === 'Escape') { event.preventDefault(); setDraft(committedText); setInvalid(typeof value === 'string'); lastCommit.current = committedText }
    }}
  />
}
