import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

export default function SeismicPanel() {
  const saved = JSON.parse(localStorage.getItem('kopruq.seismic') || 'null')
  const [a, setA] = useState(saved?.a || ''), [g, setG] = useState(saved?.g || 'B'), [t, setT] = useState(saved?.t || 'Type 1'), [i, setI] = useState(saved?.i || '1'), [details, setDetails] = useState(false), [r, setR] = useState<any>(null)
  useEffect(() => {
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a, g, t, i }))
    if (a && i) {
      fetch('http://localhost:8080/api/seismic/spectrum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agR: Number(a), importanceFactor: Number(i), groundType: g, spectrumType: t }),
      }).then(x => x.json()).then(setR)
    }
  }, [a, g, t, i])
  const point = (period: number) => r?.points?.find((x: any) => Math.abs(x.period - period) < 0.0001)?.acceleration
  const val = (x: number | undefined) => x == null ? '—' : `${x.toFixed(4)} g`
  return <div className="spn-card"><h2 className="spn-card-title">Horizontal Elastic Response Spectrum</h2><div className="spn-field-grid"><label className="spn-field">Reference PGA, agR<div className="spn-input-unit-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input className="spn-input" value={a} onChange={e => setA(e.target.value)} style={{ width: 140 }} /><span>g</span></div></label><label className="spn-field">Importance Factor, γI<input className="spn-input" value={i} onChange={e => setI(e.target.value)} /></label><label className="spn-field">Ground Type<select className="spn-input" value={g} onChange={e => setG(e.target.value)}>{'ABCDE'.split('').map(x => <option key={x}>{x}</option>)}</select></label><label className="spn-field">Spectrum Type<select className="spn-input" value={t} onChange={e => setT(e.target.value)}><option>Type 1</option><option>Type 2</option></select></label></div><p>ag={r?.ag?.toFixed(3) || '—'} g · S={r?.s || '—'} · TB={r?.tb || '—'} s · TC={r?.tc || '—'} s · TD={r?.td || '—'} s</p><ResponsiveContainer width="100%" height={280}><LineChart data={r?.points || []}><XAxis dataKey="period" /><YAxis /><Tooltip /><ReferenceLine x={r?.tb} /><ReferenceLine x={r?.tc} /><ReferenceLine x={r?.td} /><Line dataKey="acceleration" stroke="#4f9cff" dot={false} /></LineChart></ResponsiveContainer><button className="spn-button-secondary" onClick={() => setDetails(!details)}>{details ? 'Hide Calculation Details ▴' : 'Show Calculation Details ▾'}</button>{details && <div className="spn-pre"><strong>INPUT</strong>{'\n'}agR = {a || '—'} g{'\n'}γI = {i}{'\n'}Ground Type = {g}{'\n'}Spectrum Type = {t}{'\n'}ξ = 5.0 %{'\n'}η = 1.00{'\n\n'}<strong>DESIGN ACCELERATION</strong>{'\n'}ag = γI × agR = {i} × {a || '—'} = {r?.ag?.toFixed(4) || '—'} g{'\n\n'}<strong>EN SPECTRUM PARAMETERS</strong>{'\n'}S = {r?.s ?? '—'}{'\n'}TB = {r?.tb ?? '—'} s{'\n'}TC = {r?.tc ?? '—'} s{'\n'}TD = {r?.td ?? '—'} s{'\n'}η = 1.00{'\n\n'}<strong>ELASTIC RESPONSE SPECTRUM</strong>{'\n'}0 ≤ T ≤ TB: Se(T) = ag × S × [1 + (T/TB) × (2.5 − 1)]{'\n'}TB ≤ T ≤ TC: Se(T) = ag × S × 2.5{'\n'}TC ≤ T ≤ TD: Se(T) = ag × S × 2.5 × TC/T{'\n'}TD ≤ T ≤ 4.0 s: Se(T) = ag × S × 2.5 × TC × TD/T²{'\n\n'}<strong>KEY SPECTRUM VALUES</strong>{'\n'}Se(0) = {val(point(0))}{'\n'}Se(TB) = {val(point(r?.tb))}{'\n'}Se(TC) = {val(point(r?.tc))}{'\n'}Se(TD) = {val(point(r?.td))}{'\n'}Se(4.0 s) = {val(point(4))}{'\n\n'}<strong>STANDARD</strong>{'\n'}Spectrum Standard: EN 1998-1:2004 + A1:2013{'\n'}Bridge Seismic Standard: EN 1998-2:2005 + A2:2011{'\n'}National Annex: Not applied{'\n'}Hazard Source: Project / User Input{'\n'}Status: {r?.status ?? 'INVALID'}</div>}<p>Standard: EN 1998-1:2004 + A1:2013 · Bridge: EN 1998-2:2005 + A2:2011 · National Annex: Not applied</p></div>
}
