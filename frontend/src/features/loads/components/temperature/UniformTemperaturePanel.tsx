import { useEffect, useState } from 'react'
import { resolveUniformTemperature, type UniformTemperatureResult } from '../../api/temperatureService'

export default function UniformTemperaturePanel() {
  const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('spanova.uniform-temperature.inputs') ?? 'null') as { min?: string; max?: string; t0?: string } | null : null
  const [min, setMin] = useState(saved?.min ?? ''), [max, setMax] = useState(saved?.max ?? ''), [t0, setT0] = useState(saved?.t0 ?? '')
  const [details, setDetails] = useState(false)
  const [result, setResult] = useState<UniformTemperatureResult | null>(null)
  const update = async (a: string, b: string, c: string) =>
    setResult(await resolveUniformTemperature(a === '' ? null : Number(a), b === '' ? null : Number(b), c === '' ? null : Number(c)))
  useEffect(() => {
    if (min !== '' || max !== '' || t0 !== '') void update(min, max, t0)
  }, [])
  const display = (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${v} °C`
  const displayAlpha = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v * 1e6)} × 10⁻⁶ /°C`
  return <div className="spn-card" style={{ maxWidth: 620 }}>
    <h2 className="spn-card-title">Uniform Temperature</h2><p className="spn-card-subtitle">EN 1991-1-5 · Uniform temperature component</p>
    <div className="spn-field-grid" style={{ gridTemplateColumns: '1fr' }}>
      <label className="spn-field">Effective Minimum Temperature, Te,min<div className="spn-input-unit-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input className="spn-input" type="number" value={min} onChange={e => { const value = e.target.value; setMin(value); localStorage.setItem('spanova.uniform-temperature.inputs', JSON.stringify({ min: value, max, t0 })); void update(value, max, t0) }} style={{ width: 140 }} /><span>°C</span></div></label>
      <label className="spn-field">Effective Maximum Temperature, Te,max<div className="spn-input-unit-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input className="spn-input" type="number" value={max} onChange={e => { const value = e.target.value; setMax(value); localStorage.setItem('spanova.uniform-temperature.inputs', JSON.stringify({ min, max: value, t0 })); void update(min, value, t0) }} style={{ width: 140 }} /><span>°C</span></div></label>
      <label className="spn-field">Initial Temperature, T0<div className="spn-input-unit-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input className="spn-input" type="number" value={t0} onChange={e => { const value = e.target.value; setT0(value); localStorage.setItem('spanova.uniform-temperature.inputs', JSON.stringify({ min, max, t0: value })); void update(min, max, value) }} style={{ width: 140 }} /><span>°C</span></div></label>
    </div>
    <h3 className="spn-card-title" style={{ marginTop: 20 }}>Uniform Temperature Actions</h3>
    <table className="spn-table"><thead><tr><th>Material</th><th>Contraction</th><th>Expansion</th></tr></thead><tbody>
      <tr><td>Concrete<br /><small>αT = {displayAlpha(result?.concreteAlphaTPerC)}</small></td><td>{display(result?.contractionC)}</td><td>{display(result?.expansionC)}</td></tr>
      <tr><td>Structural Steel<br /><small>αT = {displayAlpha(result?.steelAlphaTPerC)}</small></td><td>{display(result?.contractionC)}</td><td>{display(result?.expansionC)}</td></tr>
    </tbody></table>
    <button className="spn-button-secondary" onClick={() => setDetails(!details)}>{details ? 'Hide Details ▴' : 'Details ▾'}</button>
    {details && <div className="spn-pre"><strong>DETAILS</strong>{'\n'}Te,min: {display(result?.effectiveMinimumC)}{'\n'}Te,max: {display(result?.effectiveMaximumC)}{'\n'}T0: {display(result?.initialTemperatureC)}{'\n'}ΔTcon = Te,min - T0: {display(result?.contractionC)}{'\n'}ΔTexp = Te,max - T0: {display(result?.expansionC)}{'\n'}Standard: EN 1991-1-5{'\n'}National Annex: Not applied{'\n'}Te Source: Project / User Input{'\n'}Status: {result?.temperatureActionStatus ?? 'INVALID'}{result?.missingParameters?.length ? `\nValidation: ${result.missingParameters.join(', ')}` : ''}</div>}
  </div>
}
