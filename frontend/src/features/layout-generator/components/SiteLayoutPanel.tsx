import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { layoutGenerationSchema, type LayoutGenerationFormValues } from '../model/layoutGenerationSchema'
import { useGenerateLayouts } from '../hooks/useGenerateLayouts'
import type { LayoutSeed } from '../model/types'

/**
 * LAYOUT-P01 (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md sections D, G, M,
 * addendum Q): one straight alignment, one bridge site, zero or more
 * no-pier zones, and the span search ranges -> candidate bridge layouts
 * (abutment/pier chainages, span arrangement), shown as a table -
 * feasible AND rejected alternatives both, for traceability. No terrain,
 * no pier/abutment height, no FEM, no map, no 3D - see the analysis
 * document for why each is deferred.
 *
 * <p>Selecting a feasible row and clicking "Use this layout in Generate"
 * carries its bridge length + uniform span length over to Generate (see
 * ../model/types.ts) - the seam into P03's existing structural
 * alternative generation, so the bridge length that reaches
 * generative-engine is the one this engine found, not one retyped by
 * hand.
 *
 * <p>Architecture migration Milestone 3 (2026-09-12): form state moved
 * from manual `useState` to React Hook Form + Zod (`../model/
 * layoutGenerationSchema.ts` - generic required/positive/min&lt;=max
 * checks only, no invented engineering rule), the no-pier-zone list is
 * now a real `useFieldArray`, and the backend call moved to `../api/
 * layoutService.ts` behind a TanStack Query `useMutation`
 * (`../hooks/useGenerateLayouts.ts`). Same request payload, same
 * results table, same "Use this layout" seam - only the plumbing moved.
 */
const initialForm: LayoutGenerationFormValues = {
  alignmentLengthM: 150,
  siteStartChainageM: 10,
  siteEndChainageM: 140,
  crossingType: 'River',
  noPierZones: [{ id: 'NPZ-1', startChainageM: 70, endChainageM: 80, description: 'Main river channel' }],
  minSpanM: 25,
  maxSpanM: 45,
  minSpanCount: 3,
  maxSpanCount: 5,
  spanLengthStepM: 5,
  c1StepM: 5,
}

export default function SiteLayoutPanel({ onUseLayout }: { onUseLayout: (seed: LayoutSeed) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LayoutGenerationFormValues>({
    resolver: zodResolver(layoutGenerationSchema),
    defaultValues: initialForm,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'noPierZones' })
  const mutation = useGenerateLayouts()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function onSubmit(data: LayoutGenerationFormValues) {
    setSelectedId(null)
    mutation.mutate(data)
  }

  const alternatives = mutation.data ?? []
  const feasibleCount = alternatives.filter((r) => r.feasible).length
  const resultSummary = !mutation.data
    ? '(not generated yet)'
    : alternatives.length === 0
      ? '0 candidate layouts - widen the site or span ranges.'
      : `${alternatives.length} candidate layout(s), ${feasibleCount} feasible.`
  const selectedRow = alternatives.find((row) => row.id === selectedId) ?? null

  return (
    // noValidate: without it, the browser's own number-input step
    // validation (default step=1) can silently block submission for a
    // fractional value before React ever sees the submit event - Zod is
    // the single source of validation truth here, not native HTML5
    // constraints.
    <form className="spn-workflow" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="spn-card">
        <h2 className="spn-card-title">Alignment & site</h2>
        <p className="spn-card-subtitle">
          One straight alignment for now (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md SITE-P01) - no terrain, no
          pier/abutment height yet (addendum Q).
        </p>
        <div className="spn-field-grid">
          <Field label="Alignment length (m)" registration={register('alignmentLengthM', { valueAsNumber: true })} error={errors.alignmentLengthM?.message} />
          <Field label="Crossing type" type="text" registration={register('crossingType')} error={errors.crossingType?.message} />
        </div>
        <RangeField
          label="Bridge site chainage (m)"
          registerMin={register('siteStartChainageM', { valueAsNumber: true })}
          registerMax={register('siteEndChainageM', { valueAsNumber: true })}
          error={errors.siteEndChainageM?.message}
        />
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">No-pier zones</h2>
        <p className="spn-card-subtitle">Chainage ranges no pier may fall inside (simplified - not a full 3D constraint yet).</p>
        {fields.map((field, i) => (
          <div key={field.id} className="spn-field-grid" style={{ marginBottom: 8 }}>
            <Field label="Id" type="text" registration={register(`noPierZones.${i}.id`)} error={errors.noPierZones?.[i]?.id?.message} />
            <Field label="Start chainage (m)" registration={register(`noPierZones.${i}.startChainageM`, { valueAsNumber: true })} error={errors.noPierZones?.[i]?.startChainageM?.message} />
            <Field label="End chainage (m)" registration={register(`noPierZones.${i}.endChainageM`, { valueAsNumber: true })} error={errors.noPierZones?.[i]?.endChainageM?.message} />
            <Field label="Description" type="text" registration={register(`noPierZones.${i}.description`)} />
            <button type="button" className="spn-button-secondary" onClick={() => remove(i)}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="spn-button-secondary"
          onClick={() => append({ id: `NPZ-${fields.length + 1}`, startChainageM: 0, endChainageM: 0, description: '' })}
        >
          + Add no-pier zone
        </button>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Span search space</h2>
        <RangeField
          label="Span length (m)"
          registerMin={register('minSpanM', { valueAsNumber: true })}
          registerMax={register('maxSpanM', { valueAsNumber: true })}
          error={errors.maxSpanM?.message ?? errors.minSpanM?.message}
        />
        <RangeField
          label="Span count"
          registerMin={register('minSpanCount', { valueAsNumber: true })}
          registerMax={register('maxSpanCount', { valueAsNumber: true })}
          error={errors.maxSpanCount?.message ?? errors.minSpanCount?.message}
        />
        <div className="spn-field-grid">
          <Field label="Span length step (m)" registration={register('spanLengthStepM', { valueAsNumber: true })} error={errors.spanLengthStepM?.message} />
          <Field label="C1 search step (m)" registration={register('c1StepM', { valueAsNumber: true })} error={errors.c1StepM?.message} />
        </div>
      </div>

      <button type="submit" className="spn-button-primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'GENERATING…' : 'GENERATE LAYOUTS'}
      </button>

      {mutation.isError && (
        <p className="spn-error">
          {mutation.error instanceof Error ? `${mutation.error.message} - is the backend running?` : 'Unknown error'}
        </p>
      )}

      <div className="spn-card">
        <h2 className="spn-card-title">{resultSummary}</h2>
        {alternatives.length > 0 && (
          <table className="spn-table">
            <thead>
              <tr>
                {['', 'C1 (m)', 'C2 (m)', 'Bridge length (m)', 'Span count', 'Span length (m)', 'Piers (m)', 'Feasible'].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)} className={row.id === selectedId ? 'spn-row-selected' : undefined}>
                  <td><input type="radio" checked={row.id === selectedId} onChange={() => setSelectedId(row.id)} /></td>
                  <td>{row.c1ChainageM.toFixed(2)}</td>
                  <td>{row.c2ChainageM.toFixed(2)}</td>
                  <td>{row.bridgeLengthM.toFixed(2)}</td>
                  <td>{row.spanCount}</td>
                  <td>{row.spanLengthM.toFixed(2)}</td>
                  <td>{row.piers.map((p) => p.chainageM.toFixed(1)).join(', ') || '-'}</td>
                  <td>{row.feasible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRow && !selectedRow.feasible && (
        <div className="spn-card">
          <h2 className="spn-card-title">Why {selectedRow.id} was rejected</h2>
          <ul>
            {selectedRow.piers
              .filter((p) => !p.feasible)
              .flatMap((p) => p.rejectionReasons.map((reason) => `Pier @ ${p.chainageM.toFixed(2)} m: ${reason}`))
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </div>
      )}

      {selectedRow && selectedRow.feasible && (
        <div className="spn-card">
          <h2 className="spn-card-title">{selectedRow.id}</h2>
          <p className="spn-card-subtitle">
            Bridge length {selectedRow.bridgeLengthM.toFixed(2)} m - {selectedRow.spanCount} x {selectedRow.spanLengthM.toFixed(2)} m spans.
          </p>
          <button
            type="button"
            className="spn-button-primary"
            onClick={() => onUseLayout({ totalLengthM: selectedRow.bridgeLengthM, spanLengthM: selectedRow.spanLengthM })}
          >
            USE THIS LAYOUT IN GENERATE &rarr;
          </button>
        </div>
      )}
    </form>
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
