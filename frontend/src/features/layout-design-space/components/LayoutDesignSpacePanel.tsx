import { useState } from 'react'

/**
 * Bridges > Layout Design Space - matches the engineer's own mockup
 * exactly (2026-09-10): which abutment positions SPANOVA determines,
 * which superstructure types/span ranges and pier shapes are allowed,
 * and which site constraints the Layout Generator should respect.
 *
 * <p><b>Presentation only so far</b> - local component state, not yet
 * wired into {@code BridgeLayoutEngine}/{@code LayoutGenerationRequest}.
 * The superstructure-type catalog (PC-01/PC-02/SC-01/SC-02), pier-shape
 * options, and the richer constraint set below don't exist in the
 * backend yet (today's engine only knows a uniform span range and
 * chainage-range no-pier zones - see Layout Generator). Wiring this
 * screen's selections into real generation is a later milestone.
 */

interface SuperstructureOption {
  code: string
  minSpanM: number
  maxSpanM: number
}

const SUPERSTRUCTURE_OPTIONS: SuperstructureOption[] = [
  { code: 'PC-01', minSpanM: 30, maxSpanM: 40 },
  { code: 'PC-02', minSpanM: 35, maxSpanM: 45 },
  { code: 'SC-01', minSpanM: 45, maxSpanM: 65 },
  { code: 'SC-02', minSpanM: 60, maxSpanM: 80 },
]

const PIER_SHAPES = ['Circular', 'Rectangular']

const CONSTRAINTS = [
  'Avoid road',
  'Avoid railway',
  'Avoid main river channel',
  'Avoid poor ground',
  'Minimize tall piers',
  'Minimize deep foundations',
]

export default function LayoutDesignSpacePanel() {
  const [determineC1, setDetermineC1] = useState(true)
  const [determineC2, setDetermineC2] = useState(true)
  const [superstructure, setSuperstructure] = useState<Set<string>>(new Set(SUPERSTRUCTURE_OPTIONS.map((o) => o.code)))
  const [pierShapes, setPierShapes] = useState<Set<string>>(new Set(PIER_SHAPES))
  const [constraints, setConstraints] = useState<Set<string>>(new Set(CONSTRAINTS))

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, key: string) {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSet(next)
  }

  return (
    <div className="spn-workflow">
      <p className="spn-hint">
        Presentation only for now - these selections are not yet wired into the Layout Generator's
        span/constraint search. Today's engine only supports a uniform span range and chainage-range
        no-pier zones (see Layout Generator).
      </p>

      <div className="spn-card">
        <h2 className="spn-card-title">Abutments</h2>
        <div className="spn-checklist">
          <Checkbox label="SPANOVA determines C1" checked={determineC1} onChange={setDetermineC1} />
          <Checkbox label="SPANOVA determines C2" checked={determineC2} onChange={setDetermineC2} />
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Superstructure</h2>
        <div className="spn-checklist">
          {SUPERSTRUCTURE_OPTIONS.map((option) => (
            <Checkbox
              key={option.code}
              label={`${option.code}    ${option.minSpanM}-${option.maxSpanM} m`}
              checked={superstructure.has(option.code)}
              onChange={() => toggle(superstructure, setSuperstructure, option.code)}
            />
          ))}
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Piers</h2>
        <div className="spn-checklist">
          {PIER_SHAPES.map((shape) => (
            <Checkbox key={shape} label={shape} checked={pierShapes.has(shape)} onChange={() => toggle(pierShapes, setPierShapes, shape)} />
          ))}
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Constraints</h2>
        <div className="spn-checklist">
          {CONSTRAINTS.map((constraint) => (
            <Checkbox
              key={constraint}
              label={constraint}
              checked={constraints.has(constraint)}
              onChange={() => toggle(constraints, setConstraints, constraint)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="spn-checklist-item">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
