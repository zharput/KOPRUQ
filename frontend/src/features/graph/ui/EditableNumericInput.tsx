import { useLayoutEffect, useRef, useState } from 'react'
import type { GraphParameterValue } from '../domain/types'

export default function EditableNumericInput({ value, integer = false, ariaLabel, disabled = false, onCommit }: { value: GraphParameterValue | undefined; integer?: boolean; ariaLabel: string; disabled?: boolean; onCommit: (value: number | string) => void }) {
  const committedText = typeof value === 'number' || typeof value === 'string' ? String(value) : ''
  const [draft, setDraft] = useState(committedText)
  const [focused, setFocused] = useState(false)
  const [invalid, setInvalid] = useState(typeof value === 'string' && !isValidNumericText(value, integer))
  const inputRef = useRef<HTMLInputElement>(null)
  const lastCommit = useRef<string | undefined>(undefined)
  const lastCommittedText = useRef(committedText)
  useLayoutEffect(() => {
    const editingThisInput = focused && document.activeElement === inputRef.current
    if (!editingThisInput && (lastCommittedText.current !== committedText || typeof value === 'string')) {
      setDraft(committedText); setInvalid(typeof value === 'string' && !isValidNumericText(value, integer)); lastCommittedText.current = committedText; lastCommit.current = undefined
    }
  }, [ariaLabel, committedText, focused, value])
  const commitDraft = () => {
    if (lastCommit.current === draft) return
    lastCommit.current = draft
    const text = draft.trim(), validSyntax = integer ? /^-?\d+$/.test(text) : /^-?(?:\d+\.?\d*|\.\d+)$/.test(text), parsed = validSyntax ? Number(text) : Number.NaN
    if (!text || !Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) { setInvalid(true); onCommit(draft); return }
    setInvalid(false); onCommit(parsed)
  }
  return <span className="spn-graph-number-control"><input className={`spn-graph-editable-number nodrag nowheel nopan${invalid ? ' is-invalid' : ''}`} ref={inputRef} aria-label={ariaLabel} aria-invalid={invalid} disabled={disabled} inputMode={integer ? 'numeric' : 'decimal'} type="number" value={draft} onFocus={() => setFocused(true)} onChange={event => { setDraft(event.target.value); setInvalid(false); lastCommit.current = undefined }} onBlur={() => { commitDraft(); setFocused(false) }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); commitDraft() }; if (event.key === 'Escape') { event.preventDefault(); setDraft(committedText); setInvalid(typeof value === 'string' && !isValidNumericText(value, integer)); lastCommit.current = committedText } }} /></span>
}
function isValidNumericText(value: string, integer: boolean) { const text = value.trim(); return (integer ? /^-?\d+$/.test(text) : /^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) && Number.isFinite(Number(text)) }
