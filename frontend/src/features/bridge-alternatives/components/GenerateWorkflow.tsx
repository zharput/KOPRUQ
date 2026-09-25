import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { kernelStateSchema, type KernelStateFormValues } from '../model/kernelStateSchema'
import { useGenerateAlternatives } from '../hooks/useGenerateAlternatives'
import type { AlternativeRow } from '../api/alternativesService'
import type { GenerationSummary } from '../model/types'
import type { LayoutSeed } from '../../layout-generator'

/**
 * P02/P03/P04/P05 (spec section 20), restyled for P10's shell: the same
 * 9-field form + GENERATE flow, same backend calls, same results table
 * and elevation preview - only the layout changed (card sections,
 * min/max pairs on one row) to match the target mockup, plus an
 * onGenerated callback so App.tsx can feed real numbers to HomePanel.
 * No new functionality, no invented data.
 *
 * <p>Optional {@code layoutSeed} (see the layout-generator feature's
 * model/types.ts): when set (the engineer arrived here via Site &
 * Layout's "Use this layout" button), pre-fills bridge length and locks
 * the span range to that layout's own values on mount - still editable
 * afterwards, just not blank/generic.
 *
 * <p>Architecture migration Milestone 3 (2026-09-12): form state moved
 * from manual `useState` to React Hook Form + Zod (`../model/
 * kernelStateSchema.ts` - generic required/positive/min&lt;=max checks
 * only, no invented engineering rule); the backend calls moved to
 * `../api/alternativesService.ts` behind a TanStack Query `useMutation`
 * (`../hooks/useGenerateAlternatives.ts`). Same requests, same results
 * table/elevation preview, same `onGenerated` summary - only the
 * plumbing moved. `BridgeHero` still updates live as the engineer types,
 * via RHF's `watch()`.
 */
const initialForm: KernelStateFormValues = {
  bridgeName: 'VIA-35',
  totalLengthM: 210,
  deckWidthM: 13.8,
  minSpanM: 30,
  maxSpanM: 45,
  minGirderCount: 4,
  maxGirderCount: 8,
  minGirderDepthM: 1.8,
  maxGirderDepthM: 2.5,
}

export default function GenerateWorkflow({
  onGenerated,
  layoutSeed,
}: {
  onGenerated: (summary: GenerationSummary) => void
  layoutSeed?: LayoutSeed | null
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<KernelStateFormValues>({
    resolver: zodResolver(kernelStateSchema),
    defaultValues: layoutSeed
      ? { ...initialForm, totalLengthM: layoutSeed.totalLengthM, minSpanM: layoutSeed.spanLengthM, maxSpanM: layoutSeed.spanLengthM }
      : initialForm,
  })
  const [layoutOrigin] = useState<string | null>(() =>
    layoutSeed
      ? `Bridge length and span locked from a Site & Layout candidate (${layoutSeed.totalLengthM} m total, ${layoutSeed.spanLengthM} m spans) - still editable below.`
      : null,
  )
  const mutation = useGenerateAlternatives()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const formValues = watch()

  function onSubmit(data: KernelStateFormValues) {
    setSelectedId(null)
    mutation.mutate(data, {
      onSuccess: (result) => {
        onGenerated({
          bridgeName: data.bridgeName,
          totalLengthM: data.totalLengthM,
          deckWidthM: data.deckWidthM,
          generatedCount: result.alternatives.length,
          feasibleCount: result.alternatives.filter((r) => r.feasible).length,
          analyzedCount: 0,
          paretoCount: 0,
        })
      },
    })
  }

  const alternatives = mutation.data?.alternatives ?? []
  const resultSummary = !mutation.data
    ? '(not generated yet)'
    : alternatives.length === 0
      ? '0 feasible alternatives - widen the ranges.'
      : `${alternatives.length} feasible alternative(s).`
  const selectedRow = alternatives.find((row) => row.id === selectedId) ?? null

  return (
    // noValidate: without it, the browser's own number-input step
    // validation (default step=1) silently blocks submission for any
    // fractional value (e.g. deckWidthM=13.8) before React ever sees
    // the submit event - Zod is the single source of validation truth
    // here, not native HTML5 constraints.
    <form className="spn-workflow" noValidate onSubmit={handleSubmit(onSubmit)}>
      {layoutOrigin && <p className="spn-hint">{layoutOrigin}</p>}
      <BridgeHero form={formValues} />

      <div className="spn-card">
        <h2 className="spn-card-title">Project</h2>
        <div className="spn-field-grid">
          <Field label="Bridge Name" type="text" registration={register('bridgeName')} error={errors.bridgeName?.message} />
          <Field label="Bridge Length (m)" registration={register('totalLengthM', { valueAsNumber: true })} error={errors.totalLengthM?.message} />
          <Field label="Deck Width (m)" registration={register('deckWidthM', { valueAsNumber: true })} error={errors.deckWidthM?.message} />
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Design space</h2>
        <RangeField label="Span (m)" registerMin={register('minSpanM', { valueAsNumber: true })} registerMax={register('maxSpanM', { valueAsNumber: true })} error={errors.maxSpanM?.message} />
        <RangeField label="Girder count" registerMin={register('minGirderCount', { valueAsNumber: true })} registerMax={register('maxGirderCount', { valueAsNumber: true })} error={errors.maxGirderCount?.message} />
        <RangeField label="Girder depth (m)" registerMin={register('minGirderDepthM', { valueAsNumber: true })} registerMax={register('maxGirderDepthM', { valueAsNumber: true })} error={errors.maxGirderDepthM?.message} />
      </div>

      <button type="submit" className="spn-button-primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'GENERATING…' : 'GENERATE ALTERNATIVES'}
      </button>

      {mutation.isError && (
        <p className="spn-error">
          {mutation.error instanceof Error ? `${mutation.error.message} - is the backend running?` : 'Unknown error'}
        </p>
      )}

      <div className="spn-card">
        <h2 className="spn-card-title">Bridge kernel state</h2>
        <p className="spn-card-subtitle">Proof the data reached the backend / bridge-core.</p>
        <pre className="spn-pre">{mutation.data ? JSON.stringify(mutation.data.kernelState, null, 2) : '(not generated yet)'}</pre>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">{resultSummary}</h2>
        {alternatives.length > 0 && (
          <table className="spn-table">
            <thead>
              <tr>
                {['', 'Span count', 'Span length (m)', 'Total length (m)', 'Girder count', 'Girder depth (m)', 'Feasible'].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)} className={row.id === selectedId ? 'spn-row-selected' : undefined}>
                  <td><input type="radio" checked={row.id === selectedId} onChange={() => setSelectedId(row.id)} /></td>
                  <td>{row.spanCount}</td>
                  <td>{row.spanLengthM}</td>
                  <td>{row.totalLengthM}</td>
                  <td>{row.girderCount}</td>
                  <td>{row.girderDepthM}</td>
                  <td>{row.feasible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRow && (
        <div className="spn-card">
          <h2 className="spn-card-title">Elevation preview</h2>
          <p className="spn-card-subtitle">Schematic, not to scale.</p>
          <ElevationPreview row={selectedRow} />
        </div>
      )}
    </form>
  )
}

/**
 * Summary banner matching the mockup's hero section - live values from
 * the form, updating as the engineer types, not tied to a generated
 * result. No bridge photograph: a decorative line-art motif (echoing the
 * KOPRUQ logo's own cable/deck silhouette) stands in for it rather than
 * a fabricated or stock image of a specific bridge. "Precast girder" is
 * the only bridge type the generative engine models (spec section 8) -
 * not an invented label.
 */
function BridgeHero({ form }: { form: KernelStateFormValues }) {
  return (
    <div className="spn-hero">
      <svg className="spn-hero-graphic" viewBox="0 0 400 130" aria-hidden="true">
        <path d="M20 95 C 120 20, 280 20, 380 95" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.5" />
        <path d="M60 95 C 140 40, 260 40, 340 95" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.35" />
        <line x1="10" y1="95" x2="390" y2="95" stroke="var(--border-strong)" strokeWidth="3" />
        <line x1="90" y1="95" x2="90" y2="125" stroke="var(--border-strong)" strokeWidth="4" />
        <line x1="310" y1="95" x2="310" y2="125" stroke="var(--border-strong)" strokeWidth="4" />
      </svg>

      <div className="spn-hero-text">
        <h1>{form.bridgeName || 'Untitled bridge'}</h1>
        <p>Precast girder viaduct</p>
      </div>

      <div className="spn-hero-stats">
        <HeroStat label="Total length" value={`${form.totalLengthM} m`} />
        <HeroStat label="Span range" value={`${form.minSpanM}-${form.maxSpanM} m`} />
        <HeroStat label="Deck width" value={`${form.deckWidthM} m`} />
        <HeroStat label="Bridge type" value="Precast girder" />
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="spn-stat">
      <span className="spn-stat-label">{label}</span>
      <span className="spn-stat-value">{value}</span>
    </div>
  )
}

/**
 * P05: a schematic elevation (side view), deliberately NOT photorealistic
 * 3D. Exaggerated girder-depth scale and position-only pier markers -
 * see roadmap.md for the full rationale (unchanged since P05).
 */
function ElevationPreview({ row }: { row: AlternativeRow }) {
  const canvasWidth = 640
  const deckY = 40
  const pierMarkerLength = 40
  const girderDepthPxPerMeter = 15 // exaggerated on purpose - see caption

  if (row.totalLengthM <= 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selected alternative has zero total length - nothing to draw.</p>
  }

  const horizontalScale = canvasWidth / row.totalLengthM
  const girderDepthPx = Math.max(row.girderDepthM * girderDepthPxPerMeter, 3)
  const svgHeight = deckY + girderDepthPx + pierMarkerLength + 30

  return (
    <svg viewBox={`0 0 ${canvasWidth} ${svgHeight}`} style={{ width: '100%', maxWidth: canvasWidth, border: '1px solid var(--border)', background: '#fff' }}>
      <rect x={0} y={deckY} width={canvasWidth} height={girderDepthPx} fill="#4682b4" />
      {Array.from({ length: row.spanCount + 1 }, (_, i) => {
        const x = i * row.spanLengthM * horizontalScale
        return <line key={i} x1={x} y1={deckY + girderDepthPx} x2={x} y2={deckY + girderDepthPx + pierMarkerLength} stroke="#888" strokeWidth={2} />
      })}
      {Array.from({ length: row.spanCount }, (_, i) => {
        const x = i * row.spanLengthM * horizontalScale + (row.spanLengthM * horizontalScale) / 2
        return <text key={i} x={x} y={deckY - 8} fontSize={11} textAnchor="middle" fill="#000">{row.spanLengthM.toFixed(1)} m</text>
      })}
      <text x={0} y={deckY + girderDepthPx + pierMarkerLength + 20} fontSize={11} fontWeight={600} fill="#000">
        {`Total: ${row.totalLengthM.toFixed(1)} m | ${row.spanCount} span(s) | girder depth ${row.girderDepthM.toFixed(2)} m (girder-depth scale exaggerated - not to scale)`}
      </text>
    </svg>
  )
}

function Field({
  label, registration, error, type = 'number',
}: {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  type?: 'text' | 'number'
}) {
  return (
    <label className="spn-field">
      <span>{label}</span>
      <input type={type} {...registration} className="spn-input" />
      {error && <span className="spn-error" style={{ fontSize: 11 }}>{error}</span>}
    </label>
  )
}

function RangeField({
  label, registerMin, registerMax, error,
}: {
  label: string
  registerMin: UseFormRegisterReturn
  registerMax: UseFormRegisterReturn
  error?: string
}) {
  return (
    <div className="spn-range-field">
      <span className="spn-range-label">{label}</span>
      <div className="spn-range-inputs">
        <input type="number" {...registerMin} className="spn-input" />
        <span className="spn-range-dash">-</span>
        <input type="number" {...registerMax} className="spn-input" />
      </div>
      {error && <span className="spn-error" style={{ fontSize: 11 }}>{error}</span>}
    </div>
  )
}
