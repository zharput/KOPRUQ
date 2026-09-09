import { useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'

/**
 * P02/P03/P04/P05 (spec section 20): a SIMPLE form over the 9 fields the
 * spec names, plus a GENERATE button. Deliberately not the final
 * dashboard (that's P10) - no sidebar, no tabs, no charts.
 *
 * GENERATE calls two backend endpoints:
 *  - /api/kernel-state (P02): echoes the constructed Bridge +
 *    DesignSpace, proving the data reached bridge-core.
 *  - /api/alternatives (P03): runs generative-engine's
 *    AlternativeGenerator and returns feasible span-layout/girder
 *    alternatives, shown in a plain table. Each row's "Feasible" column
 *    (P04) reflects rules-engine's RuleEngine - always "Yes" for now
 *    since no engineering rule has been approved yet.
 *
 * Selecting a row (P05) draws a schematic elevation - see
 * ElevationPreview below. Not photorealistic 3D (spec's own P05
 * instruction); a deliberately exaggerated girder-depth scale (same
 * approach as the archived C#/Avalonia build) and position-only pier
 * markers, since Pier is not modelled/sized yet (still null on
 * BridgeAlternative as of P01).
 */

interface KernelStateRequest {
  bridgeName: string
  totalLengthM: number
  deckWidthM: number
  minSpanM: number
  maxSpanM: number
  minGirderCount: number
  maxGirderCount: number
  minGirderDepthM: number
  maxGirderDepthM: number
}

interface AlternativeRow {
  id: string
  spanCount: number
  spanLengthM: number
  totalLengthM: number
  girderCount: number
  girderDepthM: number
  feasible: boolean
}

const API_BASE = 'http://localhost:8080'

const initialForm: KernelStateRequest = {
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

function App() {
  const [form, setForm] = useState<KernelStateRequest>(initialForm)
  const [response, setResponse] = useState<string>('(not generated yet)')
  const [alternatives, setAlternatives] = useState<AlternativeRow[]>([])
  const [resultSummary, setResultSummary] = useState<string>('(not generated yet)')
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function updateField<K extends keyof KernelStateRequest>(key: K, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === 'bridgeName' ? value : Number(value),
    }))
  }

  async function postJson<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      throw new Error(`Backend returned HTTP ${res.status} for ${path}`)
    }
    return res.json() as Promise<T>
  }

  async function handleGenerate() {
    setError(null)
    setSelectedId(null)
    try {
      const kernelState = await postJson<unknown>('/api/kernel-state')
      setResponse(JSON.stringify(kernelState, null, 2))

      const rows = await postJson<AlternativeRow[]>('/api/alternatives')
      setAlternatives(rows)
      setResultSummary(
        rows.length === 0
          ? '0 feasible alternatives - widen the ranges.'
          : `${rows.length} feasible alternative(s).`,
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} - is the backend running at ${API_BASE}?`
          : 'Unknown error',
      )
    }
  }

  const selectedRow = alternatives.find((row) => row.id === selectedId) ?? null

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.2rem' }}>SPANOVA - P05 basic UI</h1>
      <p style={{ fontSize: '0.8rem', color: '#666' }}>
        This is intentionally plain (spec section 20, P02-P05: no dashboard yet).
      </p>

      <div style={{ maxWidth: 420 }}>
        <Field label="Bridge Name" value={form.bridgeName} onChange={(v) => updateField('bridgeName', v)} />
        <Field label="Bridge Length (m)" value={form.totalLengthM} onChange={(v) => updateField('totalLengthM', v)} />
        <Field label="Deck Width (m)" value={form.deckWidthM} onChange={(v) => updateField('deckWidthM', v)} />
        <Field label="Minimum Span (m)" value={form.minSpanM} onChange={(v) => updateField('minSpanM', v)} />
        <Field label="Maximum Span (m)" value={form.maxSpanM} onChange={(v) => updateField('maxSpanM', v)} />
        <Field label="Minimum Girder Count" value={form.minGirderCount} onChange={(v) => updateField('minGirderCount', v)} />
        <Field label="Maximum Girder Count" value={form.maxGirderCount} onChange={(v) => updateField('maxGirderCount', v)} />
        <Field label="Minimum Girder Depth (m)" value={form.minGirderDepthM} onChange={(v) => updateField('minGirderDepthM', v)} />
        <Field label="Maximum Girder Depth (m)" value={form.maxGirderDepthM} onChange={(v) => updateField('maxGirderDepthM', v)} />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', fontWeight: 600 }}
      >
        GENERATE
      </button>

      {error && (
        <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>
      )}

      <h2 style={{ fontSize: '0.95rem', marginTop: '1.75rem' }}>
        Bridge Kernel state (proof the data reached the backend / bridge-core):
      </h2>
      <pre
        style={{
          border: '1px solid #ccc',
          padding: '0.75rem',
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {response}
      </pre>

      <h2 style={{ fontSize: '0.95rem', marginTop: '1.75rem' }}>{resultSummary}</h2>
      {alternatives.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {['', 'Span count', 'Span length (m)', 'Total length (m)', 'Girder count', 'Girder depth (m)', 'Feasible'].map((h, i) => (
                <th key={i} style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alternatives.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                style={{ cursor: 'pointer', backgroundColor: row.id === selectedId ? '#dbeafe' : undefined }}
              >
                <td style={cellStyle}>
                  <input type="radio" checked={row.id === selectedId} onChange={() => setSelectedId(row.id)} />
                </td>
                <td style={cellStyle}>{row.spanCount}</td>
                <td style={cellStyle}>{row.spanLengthM}</td>
                <td style={cellStyle}>{row.totalLengthM}</td>
                <td style={cellStyle}>{row.girderCount}</td>
                <td style={cellStyle}>{row.girderDepthM}</td>
                <td style={cellStyle}>{row.feasible ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedRow && (
        <>
          <h2 style={{ fontSize: '0.95rem', marginTop: '1.75rem' }}>Elevation preview (schematic, not to scale):</h2>
          <ElevationPreview row={selectedRow} />
        </>
      )}
    </main>
  )
}

const cellStyle: CSSProperties = { border: '1px solid #ccc', padding: '0.3rem' }

/**
 * P05 (spec section 20): a schematic elevation (side view) of one
 * selected alternative - deliberately NOT photorealistic 3D.
 *
 * Same approach as the archived C#/Avalonia build's DrawElevationCore:
 * - the deck is drawn as a rectangle spanning the full bridge length,
 *   with its thickness scaled from girderDepthM by a deliberately
 *   EXAGGERATED px/meter factor (real girder depths, ~1.8-2.5 m, are
 *   visually imperceptible next to 30-45 m spans at a true 1:1 scale) -
 *   this is a display choice, not an engineering quantity.
 * - span boundaries get a POSITION-ONLY marker (a vertical line) for
 *   piers/abutments - no height or width is drawn, because Pier is not
 *   modelled/sized yet (still null on BridgeAlternative as of P01); a
 *   sized pier here would be an invented dimension.
 */
function ElevationPreview({ row }: { row: AlternativeRow }) {
  const canvasWidth = 640
  const deckY = 40
  const pierMarkerLength = 40
  const girderDepthPxPerMeter = 15 // exaggerated on purpose - see caption

  if (row.totalLengthM <= 0) {
    return <p style={{ color: '#666', fontSize: '0.85rem' }}>Selected alternative has zero total length - nothing to draw.</p>
  }

  const horizontalScale = canvasWidth / row.totalLengthM
  const girderDepthPx = Math.max(row.girderDepthM * girderDepthPxPerMeter, 3)
  const svgHeight = deckY + girderDepthPx + pierMarkerLength + 30

  return (
    <svg
      viewBox={`0 0 ${canvasWidth} ${svgHeight}`}
      style={{ width: '100%', maxWidth: canvasWidth, border: '1px solid #ccc', background: '#fff' }}
    >
      <rect x={0} y={deckY} width={canvasWidth} height={girderDepthPx} fill="#4682b4" />

      {Array.from({ length: row.spanCount + 1 }, (_, i) => {
        const x = i * row.spanLengthM * horizontalScale
        return (
          <line
            key={i}
            x1={x}
            y1={deckY + girderDepthPx}
            x2={x}
            y2={deckY + girderDepthPx + pierMarkerLength}
            stroke="#888"
            strokeWidth={2}
          />
        )
      })}

      {Array.from({ length: row.spanCount }, (_, i) => {
        const x = i * row.spanLengthM * horizontalScale + (row.spanLengthM * horizontalScale) / 2
        return (
          <text key={i} x={x} y={deckY - 8} fontSize={11} textAnchor="middle" fill="#000">
            {row.spanLengthM.toFixed(1)} m
          </text>
        )
      })}

      <text x={0} y={deckY + girderDepthPx + pierMarkerLength + 20} fontSize={11} fontWeight={600} fill="#000">
        {`Total: ${row.totalLengthM.toFixed(1)} m | ${row.spanCount} span(s) | girder depth ${row.girderDepthM.toFixed(2)} m (girder-depth scale exaggerated - not to scale)`}
      </text>
    </svg>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: 'block', marginTop: '0.6rem', fontSize: '0.85rem' }}>
      {label}
      <input
        type={typeof value === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ display: 'block', width: '100%', padding: '0.35rem', marginTop: '0.15rem', boxSizing: 'border-box' }}
      />
    </label>
  )
}

export default App
