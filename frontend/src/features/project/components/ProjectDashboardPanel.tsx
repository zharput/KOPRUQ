import type { BridgeRow } from '../model/types'
import CountryMap from '../../../shared/ui/CountryMap'
import type { ProjectWorkspaceData } from '../model/projectWorkspace'

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
 * <p>frontend-remediation (2026-10-12): Project Name, Country, Status and
 * Last Update are read-only and come from the project data (edited in
 * Project > General); the former hard-coded sample values were removed.
 * The Country/Region still drives the map below (`shared/ui/CountryMap.tsx`).
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

const display = (value: string) => value.trim() ? value : 'Not defined'

export default function ProjectDashboardPanel({ bridges, designCode, project }: { bridges: BridgeRow[]; designCode: string; project: ProjectWorkspaceData }) {
  const countryRegion = project.country
  const routeLength = routeLengthKm(bridges)

  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <h2 className="spn-card-title">Project Summary</h2>

        <div className="spn-field-grid">
          <div className="spn-field"><span>Project Name</span><strong>{display(project.name)}</strong></div>
          <div className="spn-field"><span>Country / Region</span><strong>{display(countryRegion)}</strong></div>
          <div className="spn-field"><span>Status</span><strong>{display(project.status)}</strong></div>
          <div className="spn-field"><span>Last Update</span><strong>{display(project.lastModified)}</strong></div>
        </div>
        <p className="spn-card-subtitle">Project identity is edited in Project &gt; General.</p>

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
          Zoomed to the project's Country / Region ({display(countryRegion)}).
        </p>
        {countryRegion ? <CountryMap place={countryRegion} /> : <p className="spn-card-subtitle">Not defined</p>}
      </div>
    </div>
  )
}
