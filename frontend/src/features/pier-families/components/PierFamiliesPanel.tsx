import { useState } from 'react'
import { ParamSweepCard, HDim, VDim, type Dimension } from '../../../shared/ui/ParamSweepCard'

/**
 * Design System > Pier Families (2026-09-11): the 4 pier cross-section
 * shapes from the engineer's own diagram (Rectangular B/H; Circular D;
 * Oval H/B/R; Box B/H/tw1/tw2 - simplified from an initial B/H/tw/tf1/
 * tf2/C set, per the engineer's own follow-up: a box only needs 2 wall
 * thicknesses, tw1 for top/bottom and tw2 for left/right, no separate
 * inner-width C), redrawn as cleaner inline SVGs than the source sketch.
 * Per the engineer's own instructions:
 *
 * <p>- A checkbox left of each shape: "SPANOVA'nın analizlerinde o kolon
 *   kesitini kullanacağı" - whether this shape is used at all.
 * <p>- Each dimension gets min/max/delta (not a single value) - SPANOVA
 *   analyzes/optimizes across the resulting stepped value set (the
 *   engineer's own worked example: D 200-300cm step 25cm -&gt;
 *   200,225,250,275,300cm - shown live below each dimension's inputs,
 *   not just described).
 * <p>- **Crucial scoping note, stated explicitly in the UI** (the
 *   engineer's own instruction - "bununla ilgili bir açıklama olması
 *   lazım"): this min/max/delta sweep only applies to bridges whose Pier
 *   Shape (Project Information's per-bridge additional details) is set
 *   to this exact shape - a bridge using Circular piers is never swept
 *   through Rectangular's range, and vice versa.
 *
 * <p>The checkbox + diagram + min/max/delta table card is the shared
 * {@link ParamSweepCard} (shared/ui/ParamSweepCard.tsx) - extracted
 * 2026-09-11 once Girder Library needed the exact same pattern; its
 * fixed colgroup is also what fixed this screen's own edit-box
 * misalignment across shape cards.
 *
 * <p>Presentation/local state only - not wired into any backend
 * generation/optimization yet (same discipline as the rest of this
 * session's screens). No default min/max/delta are invented for
 * Rectangular/Oval/Box (spec section 22) - only Circular has the
 * engineer's own given example values; the others start at 0/0/0
 * ("not configured yet") until the engineer provides real ranges.
 */
interface PierSection {
  shape: 'Rectangular' | 'Circular' | 'Oval' | 'Box'
  enabled: boolean
  dimensions: Dimension[]
}

const INITIAL_SECTIONS: PierSection[] = [
  {
    shape: 'Rectangular',
    enabled: true,
    dimensions: [
      { key: 'B', label: 'B (cm)', min: 0, max: 0, delta: 0 },
      { key: 'H', label: 'H (cm)', min: 0, max: 0, delta: 0 },
    ],
  },
  {
    shape: 'Circular',
    enabled: true,
    dimensions: [{ key: 'D', label: 'D (cm)', min: 200, max: 300, delta: 25 }],
  },
  {
    shape: 'Oval',
    enabled: true,
    dimensions: [
      { key: 'H', label: 'H (cm)', min: 0, max: 0, delta: 0 },
      { key: 'B', label: 'B (cm)', min: 0, max: 0, delta: 0 },
      { key: 'R', label: 'R (cm)', min: 0, max: 0, delta: 0 },
    ],
  },
  {
    shape: 'Box',
    enabled: true,
    dimensions: [
      { key: 'B', label: 'B (cm)', min: 0, max: 0, delta: 0 },
      { key: 'H', label: 'H (cm)', min: 0, max: 0, delta: 0 },
      { key: 'tw1', label: 'tw1 (cm)', min: 0, max: 0, delta: 0 },
      { key: 'tw2', label: 'tw2 (cm)', min: 0, max: 0, delta: 0 },
    ],
  },
]

export default function PierFamiliesPanel() {
  const [sections, setSections] = useState<PierSection[]>(INITIAL_SECTIONS)

  function updateSection(shape: PierSection['shape'], patch: Partial<PierSection>) {
    setSections((prev) => prev.map((s) => (s.shape === shape ? { ...s, ...patch } : s)))
  }

  function updateDimension(shape: PierSection['shape'], key: string, patch: Partial<Dimension>) {
    setSections((prev) =>
      prev.map((s) =>
        s.shape === shape
          ? { ...s, dimensions: s.dimensions.map((d) => (d.key === key ? { ...d, ...patch } : d)) }
          : s,
      ),
    )
  }

  return (
    <div className="spn-workflow">
      <p className="spn-hint">
        Min/max/delta define the cross-section values SPANOVA will step through during analysis/optimization for
        this shape (e.g. the Circular example below: 200-300 cm step 25 cm gives 200, 225, 250, 275, 300 cm). This
        sweep applies only to bridges whose Pier Shape (Project Information's per-bridge additional details) is set
        to this exact shape - a bridge using Circular piers is never affected by Rectangular's range, and vice versa.
      </p>

      {sections.map((section) => (
        <ParamSweepCard
          key={section.shape}
          title={section.shape}
          enabled={section.enabled}
          onToggleEnabled={(checked) => updateSection(section.shape, { enabled: checked })}
          diagram={<PierDiagram shape={section.shape} />}
          dimensions={section.dimensions}
          onUpdateDimension={(key, patch) => updateDimension(section.shape, key, patch)}
        />
      ))}
    </div>
  )
}

/* ---- Cross-section diagrams ---- */

function PierDiagram({ shape }: { shape: PierSection['shape'] }) {
  const fill = 'var(--accent)'
  const fillOpacity = 0.22

  if (shape === 'Rectangular') {
    return (
      <svg viewBox="0 0 160 150" width="150" height="140">
        <rect x={40} y={35} width={80} height={80} rx={3} fill={fill} fillOpacity={fillOpacity} stroke={fill} strokeWidth={2} />
        <HDim x1={40} x2={120} y={22} label="B" />
        <VDim y1={35} y2={115} x={26} label="H" />
      </svg>
    )
  }

  if (shape === 'Circular') {
    return (
      <svg viewBox="0 0 160 150" width="150" height="140">
        <circle cx={80} cy={75} r={45} fill={fill} fillOpacity={fillOpacity} stroke={fill} strokeWidth={2} />
        <VDim y1={30} y2={120} x={80} label="D" labelX={96} />
      </svg>
    )
  }

  if (shape === 'Oval') {
    return (
      <svg viewBox="0 0 180 150" width="168" height="140">
        <rect x={30} y={40} width={120} height={60} rx={30} ry={30} fill={fill} fillOpacity={fillOpacity} stroke={fill} strokeWidth={2} />
        <HDim x1={30} x2={150} y={118} label="B" />
        <VDim y1={40} y2={100} x={16} label="H" />
        <g stroke="var(--text-secondary)" fill="var(--text-secondary)">
          <line x1={140} y1={45} x2={160} y2={28} strokeWidth={1} />
          <path d="M160,28 l-8,1 l3,7 Z" />
          <text x={166} y={26} fontSize={10} stroke="none">
            R
          </text>
        </g>
      </svg>
    )
  }

  // Box - simplified to just 2 wall thicknesses (2026-09-11, engineer's own
  // instruction): tw1 = top/bottom wall thickness, tw2 = left/right wall
  // thickness - no separate inner width (C) or top/bottom-specific (tf1/tf2)
  // dimensions anymore.
  return (
    <svg viewBox="0 0 190 160" width="168" height="141">
      <path
        d="M30,30 H150 V130 H30 Z M46,42 H134 V118 H46 Z"
        fillRule="evenodd"
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={fill}
        strokeWidth={2}
      />
      <HDim x1={30} x2={150} y={18} label="B" />
      <VDim y1={30} y2={130} x={16} label="H" />
      <HDim x1={30} x2={46} y={148} label="tw2" />
      <VDim y1={30} y2={42} x={162} label="tw1" labelX={178} />
    </svg>
  )
}
