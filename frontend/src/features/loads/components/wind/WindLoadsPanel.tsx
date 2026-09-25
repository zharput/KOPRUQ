import { useState } from 'react'

const CATEGORIES = ['0', 'I', 'II', 'III', 'IV']

export default function WindLoadsPanel({ deckWidthM }: { deckWidthM: number }) {
  const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kopruq.wind-load.inputs') ?? 'null') as { vb?: string; terrain?: string; ze?: string } | null : null
  const [vb, setVb] = useState(saved?.vb ?? ''), [terrain, setTerrain] = useState(saved?.terrain ?? 'II'), [ze, setZe] = useState(saved?.ze ?? ''), [details, setDetails] = useState(false), [result, setResult] = useState<any>(null)
  const calculate = async () => {
    const r = await fetch('http://localhost:8080/api/wind-loads/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vbMs: Number(vb), terrainCategory: terrain, zeM: Number(ze), deckWidthM, drefM: 3 }),
    })
    if (r.ok) setResult(await r.json())
  }
  const n = (v: number | null | undefined, unit = '') => v == null ? 'â€”' : `${v.toFixed(3)} ${unit}`
  const fieldRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 160px', alignItems: 'center', columnGap: 12 }
  const unitRowStyle = { display: 'flex', alignItems: 'center', gap: 6 }
  return <div className="spn-card" style={{ maxWidth: 700 }}>
    <h2 className="spn-card-title">Wind Load</h2>
    <p className="spn-card-subtitle">EN 1991-1-4 Â· Wind actions on bridges</p>
    <div className="spn-field-grid" style={{ gridTemplateColumns: '1fr' }}>
      <label className="spn-field" style={fieldRowStyle}>
        <span>Basic Wind Velocity, vb</span>
        <div className="spn-input-unit-row" style={unitRowStyle}>
          <input className="spn-input" type="number" value={vb} onChange={e => { const value = e.target.value; setVb(value); localStorage.setItem('kopruq.wind-load.inputs', JSON.stringify({ vb: value, terrain, ze })) }} style={{ width: 140 }} />
          <span>m/s</span>
        </div>
      </label>
      <label className="spn-field" style={fieldRowStyle}>
        <span>Terrain Category</span>
        <select className="spn-input" style={{ width: 160 }} value={terrain} onChange={e => { const value = e.target.value; setTerrain(value); localStorage.setItem('kopruq.wind-load.inputs', JSON.stringify({ vb, terrain: value, ze })) }}>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
      </label>
      <label className="spn-field" style={fieldRowStyle}>
        <span>Reference Height, ze</span>
        <div className="spn-input-unit-row" style={unitRowStyle}>
          <input className="spn-input" type="number" value={ze} onChange={e => { const value = e.target.value; setZe(value); localStorage.setItem('kopruq.wind-load.inputs', JSON.stringify({ vb, terrain, ze: value })) }} style={{ width: 140 }} />
          <span>m</span>
        </div>
      </label>
      <label className="spn-field" style={fieldRowStyle}>
        <span>Deck Width, b</span>
        <div className="spn-input-unit-row" style={unitRowStyle}>
          <input className="spn-input spn-input-passive" value={deckWidthM.toFixed(2)} readOnly style={{ width: 140 }} />
          <span>m</span>
        </div>
      </label>
      <label className="spn-field" style={fieldRowStyle}>
        <span>Loaded Deck Height, dref</span>
        <div className="spn-input-unit-row" style={unitRowStyle}>
          <input className="spn-input spn-input-passive" value="3.00" readOnly style={{ width: 140 }} />
          <span>m</span>
        </div>
        <small style={{ gridColumn: '2' }}>Default; future Bridge Data</small>
      </label>
    </div>
    <button className="spn-button-primary" onClick={() => void calculate()}>Calculate Wind</button>
    <h3 className="spn-card-title" style={{ marginTop: 20 }}>Wind Actions</h3>
    <table className="spn-table"><thead><tr><th>Case</th><th>Transverse</th><th>Longitudinal</th><th>Vertical</th></tr></thead><tbody><tr><td>Without Traffic</td><td>{n(result?.transverseKNm, 'kN/m')}</td><td>NOT_IMPLEMENTED</td><td>NOT_IMPLEMENTED</td></tr><tr><td>With Traffic</td><td>NOT_IMPLEMENTED</td><td>NOT_IMPLEMENTED</td><td>NOT_IMPLEMENTED</td></tr></tbody></table>
    <button className="spn-button-secondary" onClick={() => setDetails(!details)}>{details ? 'Hide Details â–´' : 'Details â–¾'}</button>{details && <div className="spn-pre"><strong>DETAILS</strong>{'\n'}vb: {vb || 'â€”'} m/s{`\n`}Terrain: {terrain}{`\n`}ze: {ze || 'â€”'} m{`\n`}b: {deckWidthM.toFixed(2)} m{`\n`}dref: 3.00 m (Default){`\n`}b/dref: {n(result?.bOverD)}{`\n`}z0: {n(result?.z0M, 'm')}{`\n`}zmin: {n(result?.zminM, 'm')}{`\n`}kr: {n(result?.kr)}{`\n`}cr(z): {n(result?.cr)}{`\n`}vm(z): {n(result?.vmMs, 'm/s')}{`\n`}Iv(z): {n(result?.turbulenceIntensity)}{`\n`}qp(z): {n(result?.qpKNm2, 'kN/mÂ²')}{`\n`}cfx: {n(result?.cfx)}{`\n`}Fw,transverse: {n(result?.transverseKNm, 'kN/m')}{`\n`}Standard: EN 1991-1-4{`\n`}National Annex: Not applied{`\n`}Geometry Source: Project / User Input{`\n`}Status: {result?.status ?? 'INVALID'}</div>}</div>
}
