import { useState } from 'react'
import type { BridgeRow } from '../model/types'
import { COUNTRIES } from '../../../shared/lib/countries'
import CountryMap from '../../../shared/ui/CountryMap'

/**
 * Project Dashboard (2026-09-11, engineer's own mockup): "PROJECT
 * SUMMARY" - Project Name, Country/Region, Status, Last Update, then
 * Route Length, Number of Bridges, Design Code, then a live map.
 *
 * <p>Route Length and Number of Bridges are **real, computed from the
 * same `bridges` data Project Information edits** (lifted to `App.tsx`
 * so both screens share one source of truth) - not invented. Route
 * Length = max(KM) - min(KM) across all bridges with a parseable
 * chainage (e.g. "13+180.000" -&gt; 13.18 km), the corridor span the
 * current bridge list actually covers. Design Code mirrors Project
 * Information's own dropdown (also lifted, same reasoning).
 *
 * <p>2026-09-13 (engineer's own given values, real project - not a
 * placeholder): Project Name = "Sibiu-Pitesti-Lot2", Country = "Romania",
 * Status = "Continue...". Per the engineer's own instruction: the
 * Project Name/Country/Status/Last Update block is at the TOP of the
 * page, the stats block (led by Route Length) is second, and the card
 * title has no "1." prefix.
 *
 * <p>Country/Region is now a dropdown (`shared/lib/countries.ts`), not
 * free text (later same day, engineer's own instruction - "country
 * pop-list olmalı") - selecting a country re-centers/zooms the map
 * below (`shared/ui/CountryMap.tsx`) onto it.
 */
function parseChainageKm(km: string): number | null {
  const match = km.trim().match(/^(\d+)\+(\d+(?:\.\d+)?)$/)
  if (!match) return null
  return Number(match[1]) + Number(match[2]) / 1000
}

function routeLengthKm(bridges: BridgeRow[]): number | null {
  const kms = bridges.map((b) => parseChainageKm(b.km)).filter((v): v is number => v !== null)
  if (kms.length === 0) return null
  return Math.max(...kms) - Math.min(...kms)
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function ProjectDashboardPanel({ bridges, designCode }: { bridges: BridgeRow[]; designCode: string }) {
  const [projectName, setProjectName] = useState('Sibiu-Pitesti-Lot2')
  const [countryRegion, setCountryRegion] = useState('Romania')
  const [status, setStatus] = useState('Continue...')
  const [lastUpdate, setLastUpdate] = useState(TODAY)

  const routeLength = routeLengthKm(bridges)

  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <h2 className="spn-card-title">Project Summary</h2>

        <div className="spn-field-grid">
          <label className="spn-field">
            <span>Project Name</span>
            <input className="spn-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter project name" />
          </label>
          <label className="spn-field">
            <span>Country / Region</span>
            <select className="spn-input" value={countryRegion} onChange={(e) => setCountryRegion(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="spn-field">
            <span>Status</span>
            <input className="spn-input" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. In Design" />
          </label>
          <label className="spn-field">
            <span>Last Update</span>
            <input type="date" className="spn-input" value={lastUpdate} onChange={(e) => setLastUpdate(e.target.value)} />
          </label>
        </div>

        <div className="spn-project-facts" style={{ marginTop: 18 }}>
          <div className="spn-stat">
            <span className="spn-stat-label">Route Length</span>
            <span className="spn-stat-value">{routeLength !== null ? `${routeLength.toFixed(2)} km` : '—'}</span>
          </div>
          <div className="spn-stat">
            <span className="spn-stat-label">Number of Bridges</span>
            <span className="spn-stat-value">{bridges.length}</span>
          </div>
          <div className="spn-stat">
            <span className="spn-stat-label">Design Code</span>
            <span className="spn-stat-value">{designCode}</span>
          </div>
        </div>
        <p className="spn-card-subtitle" style={{ marginTop: 10 }}>
          Route Length and Number of Bridges are computed live from Project Information's Bridge Information table
          ({bridges.length} rows). Design Code mirrors Project Information's own setting.
        </p>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Map</h2>
        <p className="spn-card-subtitle" style={{ marginBottom: 10 }}>
          Zoomed to the selected Country / Region above ({countryRegion}).
        </p>
        <CountryMap place={countryRegion} />
      </div>
    </div>
  )
}
