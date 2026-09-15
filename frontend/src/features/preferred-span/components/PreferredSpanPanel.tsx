import { useEffect, useMemo, useState } from 'react'
import { generatePrecastGirderVariants, PRECAST_DIMENSIONS, type GirderVariant } from '../../girder-library/model/variants'
import type { Dimension } from '../../../shared/ui/ParamSweepCard'
import type { PreferredSpanRule, PreferredSpanStatus, SuperstructureType } from '../model/types'

const RULES_KEY = 'spanova.project-design-system.girder-span-rules'
const GIRDER_KEY = 'spanova.girder-library.precast'

function candidateSpans(minSpan: number, maxSpan: number, delta: number): number[] {
  if (!Number.isFinite(minSpan) || !Number.isFinite(maxSpan) || !Number.isFinite(delta) || minSpan <= 0 || maxSpan <= minSpan || delta <= 0 || delta > maxSpan - minSpan) return []
  const count = Math.floor((maxSpan - minSpan) / delta + 1e-10)
  return Array.from({ length: count + 1 }, (_, index) => Number((minSpan + index * delta).toFixed(10)))
}

function statusOf(rule: PreferredSpanRule, variants: GirderVariant[]): PreferredSpanStatus {
  if (!variants.some((variant) => variant.id === rule.girderVariantId)) return 'INCOMPLETE'
  const values = candidateSpans(rule.minSpan, rule.maxSpan, rule.spanDelta)
  if (rule.minSpan <= 0 || rule.maxSpan <= rule.minSpan || rule.spanDelta <= 0 || rule.spanDelta > rule.maxSpan - rule.minSpan) return 'INVALID'
  if (values.length === 0) return 'INVALID'
  if (!values.includes(rule.primarySpan)) return 'INCOMPLETE'
  return 'VALID'
}

function dimensionsFromStorage(): Dimension[] {
  if (typeof window === 'undefined') return PRECAST_DIMENSIONS
  try {
    const saved = JSON.parse(localStorage.getItem(GIRDER_KEY) ?? 'null') as { dimensions?: Dimension[] } | null
    return saved?.dimensions ?? PRECAST_DIMENSIONS
  } catch {
    return PRECAST_DIMENSIONS
  }
}

function readRules(): PreferredSpanRule[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) ?? '[]') as PreferredSpanRule[]
  } catch {
    return []
  }
}

function syncRules(existing: PreferredSpanRule[], variants: GirderVariant[], type: SuperstructureType): PreferredSpanRule[] {
  const current = existing.filter((rule) => rule.superstructureType === type)
  return variants.map((variant) => current.find((rule) => rule.girderVariantId === variant.id) ?? ({
    id: `girder-span-${variant.id}`,
    superstructureType: type,
    girderVariantId: variant.id,
    minSpan: 0,
    maxSpan: 0,
    spanDelta: 0,
    primarySpan: 0,
    enabled: true,
    source: 'PROJECT_DESIGN_SYSTEM',
  } satisfies PreferredSpanRule))
}

export default function PreferredSpanPanel() {
  const [type, setType] = useState<SuperstructureType>('PRECAST_GIRDER')
  const [dimensions, setDimensions] = useState<Dimension[]>(dimensionsFromStorage)
  const [rules, setRules] = useState<PreferredSpanRule[]>(readRules)
  const variants = useMemo(() => type === 'PRECAST_GIRDER' ? generatePrecastGirderVariants(dimensions) : [], [dimensions, type])
  const visibleRules = useMemo(() => syncRules(rules, variants, type), [rules, type, variants])

  useEffect(() => {
    setRules((previous) => {
      const next = [...previous.filter((rule) => rule.superstructureType !== type), ...syncRules(previous, variants, type)]
      const oldIds = previous.filter((rule) => rule.superstructureType === type).map((rule) => rule.girderVariantId).join('|')
      const nextIds = next.filter((rule) => rule.superstructureType === type).map((rule) => rule.girderVariantId).join('|')
      return oldIds === nextIds ? previous : next
    })
  }, [type, variants])

  useEffect(() => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
  }, [rules])

  useEffect(() => {
    const refresh = () => {
      setDimensions(dimensionsFromStorage())
      setRules((previous) => [...previous.filter((rule) => rule.superstructureType !== 'PRECAST_GIRDER'), ...syncRules(previous, generatePrecastGirderVariants(dimensionsFromStorage()), 'PRECAST_GIRDER')])
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  function updateRule(id: string, patch: Partial<PreferredSpanRule>) {
    setRules((previous) => previous.map((rule) => rule.id === id ? { ...rule, ...patch } : rule))
  }

  return <div className="spn-workflow">
    <div className="spn-card">
      <h2 className="spn-card-title">PREFERRED SPAN</h2>
      <p className="spn-card-subtitle">Project Design System / User Defined</p>
      <label className="spn-field" style={{ maxWidth: 320 }}>Superstructure Type<select className="spn-input" value={type} onChange={(event) => setType(event.target.value as SuperstructureType)}><option value="PRECAST_GIRDER">Precast Girder</option><option value="STEEL_GIRDER">Steel Girder</option></select></label>
      {type === 'STEEL_GIRDER' ? <p className="spn-hint">No generated Steel Girder variants available.</p> : <>
        <p className="spn-hint">Girder variants are read from the current Girder Library H values. Existing rules are preserved by variant ID.</p>
        <GirderSpanTable variants={variants} rules={visibleRules} onUpdate={updateRule} />
      </>}
    </div>
  </div>
}

function GirderSpanTable({ variants, rules, onUpdate }: { variants: GirderVariant[]; rules: PreferredSpanRule[]; onUpdate: (id: string, patch: Partial<PreferredSpanRule>) => void }) {
  return <div style={{ overflowX: 'auto', marginTop: 18 }}><table className="spn-table" style={{ minWidth: 980 }}><colgroup><col style={{ width: 110 }} /><col style={{ width: 145 }} /><col style={{ width: 145 }} /><col style={{ width: 135 }} /><col style={{ width: 280 }} /><col style={{ width: 145 }} /><col style={{ width: 110 }} /></colgroup><thead><tr><th>Girder</th><th>Min Span</th><th>Max Span</th><th>Delta</th><th style={{ minWidth: 280 }}>Values SPANOVA Will Use</th><th>Primary Span</th><th>Status</th></tr></thead><tbody>{variants.map((variant) => { const rule = rules.find((item) => item.girderVariantId === variant.id); if (!rule) return null; const values = candidateSpans(rule.minSpan, rule.maxSpan, rule.spanDelta); const status = statusOf(rule, variants); return <tr key={variant.id}><td>{variant.label}</td><td><NumberCell value={rule.minSpan} onChange={(value) => onUpdate(rule.id, { minSpan: value })} /></td><td><NumberCell value={rule.maxSpan} onChange={(value) => onUpdate(rule.id, { maxSpan: value })} /></td><td><NumberCell value={rule.spanDelta} onChange={(value) => onUpdate(rule.id, { spanDelta: value })} /></td><td style={{ minWidth: 280, whiteSpace: 'nowrap' }}>{values.length ? values.join(', ') : '—'}</td><td><select className="spn-input" value={values.includes(rule.primarySpan) ? rule.primarySpan : ''} onChange={(event) => onUpdate(rule.id, { primarySpan: Number(event.target.value) })} style={{ width: 110 }}><option value="" disabled>Select</option>{values.map((value) => <option key={value} value={value}>{value} m</option>)}</select></td><td>{status}</td></tr>})}</tbody></table></div>
}

function NumberCell({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input className="spn-input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ width: 100 }} /><span>m</span></div>
}
