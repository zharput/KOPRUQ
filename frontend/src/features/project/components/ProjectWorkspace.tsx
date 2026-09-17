import { useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BridgeRow } from '../model/types'
import type { ProjectWorkspaceData } from '../model/projectWorkspace'
import ProjectDashboardPanel from './ProjectDashboardPanel'
import ProjectPanel from './ProjectPanel'
import { CostDatabasePanel } from '../../cost-database'
import { COUNTRIES } from '../../../shared/lib/countries'

type Props = { path: string; project: ProjectWorkspaceData; setProject: (next: ProjectWorkspaceData) => void; bridges: BridgeRow[]; setBridges: Dispatch<SetStateAction<BridgeRow[]>>; designCode: string; setDesignCode: Dispatch<SetStateAction<string>> }
const NAV: { group?: string; label: string; slug: string }[] = [
  { label: 'Overview', slug: 'overview' },
  { group: 'Project Information', label: 'General', slug: 'general' }, { group: 'Project Information', label: 'Location', slug: 'location' }, { group: 'Project Information', label: 'Stakeholders', slug: 'stakeholders' }, { group: 'Project Information', label: 'Schedule', slug: 'schedule' }, { group: 'Project Information', label: 'Notes', slug: 'notes' }, { group: 'Project Information', label: 'Bridge Information', slug: 'bridge-information' },
  { group: 'Design Settings', label: 'Design Codes', slug: 'design-codes' }, { group: 'Design Settings', label: 'Units & Preferences', slug: 'units' }, { group: 'Design Settings', label: 'Coordinate System', slug: 'coordinate-system' }, { group: 'Design Settings', label: 'Design Criteria', slug: 'design-criteria' },
  { group: 'Site & Environment', label: 'Terrain & GIS', slug: 'terrain' }, { group: 'Site & Environment', label: 'Geotechnical', slug: 'geotechnical' }, { group: 'Site & Environment', label: 'Hydrology', slug: 'hydrology' }, { group: 'Site & Environment', label: 'Seismic', slug: 'seismic' }, { group: 'Site & Environment', label: 'Climate & Wind', slug: 'climate' },
  { group: 'Data', label: 'Cost Database', slug: 'cost-database' }, { group: 'Data', label: 'Files & Documents', slug: 'documents' },
]
const FIELDS: Record<string, { label: string; path: string }[]> = {
  General: [{ label: 'Project Name', path: 'name' }, { label: 'Project ID', path: 'id' }, { label: 'Project Type', path: 'projectType' }, { label: 'Status', path: 'status' }],
  Location: [{ label: 'Country', path: 'country' }, { label: 'Region', path: 'region' }, { label: 'Coordinate System', path: 'coordinateSystem' }, { label: 'Start Coordinate', path: 'locationStart' }, { label: 'End Coordinate', path: 'locationEnd' }],
  Stakeholders: [{ label: 'Client', path: 'client' }, { label: 'Designer', path: 'designer' }],
  Schedule: [{ label: 'Start Date', path: 'startDate' }, { label: 'Target Date', path: 'targetDate' }],
  Notes: [{ label: 'Project Description', path: 'description' }],
  'Design Codes': [{ label: 'Design Standard Family', path: 'designStandardFamily' }, { label: 'Concrete Design Code', path: 'concreteCode' }, { label: 'Steel Design Code', path: 'steelCode' }, { label: 'Composite Design Code', path: 'compositeCode' }, { label: 'Seismic Design Code', path: 'seismicCode' }, { label: 'Geotechnical Design Code', path: 'geotechnicalCode' }, { label: 'Traffic Load Standard', path: 'trafficLoadStandard' }],
  'Units & Preferences': ['length', 'force', 'moment', 'stress', 'mass', 'temperature'].map((key) => ({ label: `${key[0].toUpperCase()}${key.slice(1)}`, path: `units.${key}` })),
  'Coordinate System': [{ label: 'Coordinate System Name', path: 'coordinate.name' }, { label: 'EPSG Code', path: 'coordinate.epsg' }, { label: 'Horizontal Datum', path: 'coordinate.horizontalDatum' }, { label: 'Vertical Datum', path: 'coordinate.verticalDatum' }, { label: 'Project Origin X', path: 'coordinate.originX' }, { label: 'Project Origin Y', path: 'coordinate.originY' }, { label: 'Project Origin Z', path: 'coordinate.originZ' }, { label: 'Rotation / North Angle', path: 'coordinate.northAngle' }],
  'Design Criteria': [{ label: 'Design Life', path: 'criteria.designLife' }, { label: 'Importance / Reliability Class', path: 'criteria.reliabilityClass' }, { label: 'Exposure Assumptions', path: 'criteria.exposure' }, { label: 'Default Material Class', path: 'criteria.concreteClass' }, { label: 'Default Cover', path: 'criteria.cover' }, { label: 'Design Philosophy', path: 'criteria.philosophy' }],
}
const SITE_SLUGS: Record<string, string> = { terrain: 'Terrain & GIS', geotechnical: 'Geotechnical', hydrology: 'Hydrology', seismic: 'Seismic', climate: 'Climate & Wind' }
function getPath(project: ProjectWorkspaceData, path: string): string { let value: unknown = project; for (const part of path.split('.')) value = (value as Record<string, unknown>)[part]; return typeof value === 'string' ? value : '' }
function writePath(project: ProjectWorkspaceData, path: string, value: string): ProjectWorkspaceData {
  const result = structuredClone(project) as unknown as Record<string, unknown>; const parts = path.split('.'); let cursor = result
  for (const part of parts.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>
  cursor[parts.at(-1)!] = value
  return result as unknown as ProjectWorkspaceData
}
function display(value: string) { return value.trim() || 'Not defined' }

export default function ProjectWorkspace({ path, project, setProject, bridges, setBridges, designCode, setDesignCode }: Props) {
  const navigate = useNavigate()
  const slug = path.split('/')[2] || 'overview'
  const selected = NAV.find((item) => item.slug === slug) ?? NAV[0]
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<'General' | 'Additional Info'>('General')
  const [draft, setDraft] = useState(project)
  const select = (entry: typeof NAV[number]) => navigate(entry.slug === 'overview' ? '/project' : `/project/${entry.slug}`)
  const startEdit = () => { setDraft(project); setEditing(true); setTab('General') }
  const save = () => { setProject({ ...draft, lastModified: new Date().toISOString().slice(0, 10) }); setEditing(false) }
  const update = (field: string, value: string) => setDraft((previous) => writePath(previous, field, value))
  const setField = (path: string, label: string) => <label className="spn-field" key={path}><span>{label}</span>{path === 'country' && editing ? <select className="spn-input" value={getPath(draft, path)} onChange={(event) => update(path, event.target.value)}><option value="">Not defined</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select> : path === 'description' && editing ? <textarea className="spn-input" rows={5} value={getPath(draft, path)} placeholder="Not defined" onChange={(event) => update(path, event.target.value)} /> : <input className="spn-input" type={path === 'startDate' || path === 'targetDate' ? 'date' : 'text'} value={getPath(editing ? draft : project, path)} readOnly={!editing} placeholder="Not defined" onChange={(event) => update(path, event.target.value)} />}</label>
  const selectedTitle = selected.group === 'Design Settings' ? ({ 'design-codes': 'Design Codes', units: 'Units & Preferences', 'coordinate-system': 'Coordinate System', 'design-criteria': 'Design Criteria' } as Record<string, string>)[slug] : selected.group === 'Project Information' ? ({ general: 'General', location: 'Location', stakeholders: 'Stakeholders', schedule: 'Schedule', notes: 'Notes' } as Record<string, string>)[slug] : undefined
  const fields = FIELDS[selectedTitle ?? '']

  const grouped = NAV.reduce<{ group: string; entries: typeof NAV }[]>((groups, entry) => {
    const group = entry.group ?? 'Project'
    let bucket = groups.find((item) => item.group === group)
    if (!bucket) { bucket = { group, entries: [] }; groups.push(bucket) }
    bucket.entries.push(entry); return groups
  }, [])

  let content
  if (slug === 'overview') {
    const names = [...new Set(bridges.map((bridge) => bridge.bridgeType).filter(Boolean))]
    const totalLength = bridges.length ? bridges.reduce((sum, bridge) => sum + (Number.isFinite(bridge.estimatedLengthM) ? bridge.estimatedLengthM : 0), 0) : null
    content = <div className="spn-project-overview">
      <div className="spn-project-overview-heading"><div><h1>Project Overview</h1><p>General information and key project data</p></div><button className="spn-button-secondary" onClick={startEdit}>Edit Project</button></div>
      <section className="spn-project-identity"><div className="spn-project-name">{display(project.name)}</div><div className="spn-project-identity-grid">{[['Project ID', project.id], ['Client', project.client], ['Designer', project.designer], ['Country', project.country], ['Project Type', project.projectType], ['Status', project.status], ['Start Date', project.startDate], ['Target Date', project.targetDate]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{display(value)}</strong></div>)}</div></section>
      <div className="spn-project-metrics">{[['Total Bridges', bridges.length ? String(bridges.length) : '—'], ['Total Bridge Length', totalLength === null ? '—' : `${totalLength.toLocaleString()} m`], ['Bridge Types', names.length ? names.join(', ') : '—'], ['Active Design Alternatives', '—'], ['Last Modified', project.lastModified || '—']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="spn-project-overview-columns"><section className="spn-card"><h2 className="spn-card-title">Project Location</h2><dl className="spn-project-facts-list">{[['Country', project.country], ['Region', project.region], ['Start Coordinate', project.locationStart], ['End Coordinate', project.locationEnd], ['Coordinate System', project.coordinateSystem || project.coordinate.name]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl><p className="spn-card-subtitle">{project.country || project.locationStart || project.locationEnd ? 'Project location details are shown from project data.' : 'Location data not defined'}</p></section><section className="spn-card"><h2 className="spn-card-title">Project Description</h2><p className="spn-project-description">{display(project.description)}</p></section></div>
    </div>
  } else if (slug === 'bridge-information') {
    content = <div className="spn-workspace-feature"><ProjectPanel bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode} showProjectSettings={false} /></div>
  } else if (slug === 'cost-database') {
    content = <div className="spn-workspace-feature"><CostDatabasePanel /></div>
  } else if (slug === 'documents') {
    content = <section className="spn-card"><h1 className="spn-card-title">Files & Documents</h1><p className="spn-card-subtitle">No project document storage is configured.</p></section>
  } else if (SITE_SLUGS[slug]) {
    content = <section className="spn-card"><h1 className="spn-card-title">{SITE_SLUGS[slug]}</h1><p className="spn-card-subtitle">Existing module — integration scheduled for Bridge Definition migration.</p></section>
  } else if (fields) {
    content = <div className="spn-project-settings"><div className="spn-project-settings-heading"><div><h1>{selectedTitle}</h1><p>Project-level information and selections</p></div>{selectedTitle === 'General' && <button className="spn-button-secondary" onClick={startEdit}>Edit Project</button>}</div>
      {selectedTitle === 'General' ? <div className="spn-project-read-grid">{fields.map(({ path: fieldPath, label }) => <div key={fieldPath}><span>{label}</span><strong>{display(getPath(project, fieldPath))}</strong></div>)}</div> : <div className="spn-field-grid">{fields.map(({ path: fieldPath, label }) => setField(fieldPath, label))}</div>}
      {selectedTitle === 'Design Codes' && <p className="spn-card-subtitle">Selections are stored at project level; code behavior and engineering rules are not implemented here.</p>}
      {selectedTitle === 'Units & Preferences' && <p className="spn-card-subtitle">Unit selections only. No unit conversion behavior is changed in this phase.</p>}
      {editing && <div className="spn-project-edit-actions"><button className="spn-button-primary" onClick={save}>Save</button><button className="spn-button-secondary" onClick={() => { setDraft(project); setEditing(false) }}>Cancel</button></div>}
    </div>
  } else content = <ProjectDashboardPanel bridges={bridges} designCode={designCode} />

  const generalFields = FIELDS.General.concat(FIELDS.Stakeholders, [{ label: 'Country', path: 'country' }, { label: 'Start Date', path: 'startDate' }, { label: 'Target Date', path: 'targetDate' }])
  const additionalFields = [{ label: 'Project Type', path: 'projectType' }, { label: 'Region', path: 'region' }, { label: 'Coordinate System', path: 'coordinateSystem' }, { label: 'Project Description', path: 'description' }]
  return <div className="spn-project-shell">
    <aside className="spn-project-navigation" aria-label="Project sections">{grouped.map(({ group, entries }) => <div key={group} className="spn-project-nav-group"><div>{group}</div>{entries.map((entry) => <button key={entry.slug} type="button" className={entry.slug === slug ? 'active' : ''} onClick={() => select(entry)}>{entry.label}</button>)}</div>)}</aside>
    <main className="spn-project-center">{content}</main>
    <aside className="spn-project-properties" aria-label="Project Properties"><header><strong>Project Properties</strong></header><div className="spn-project-tabs"><button className={tab === 'General' ? 'active' : ''} onClick={() => setTab('General')}>General</button><button className={tab === 'Additional Info' ? 'active' : ''} onClick={() => setTab('Additional Info')}>Additional Info</button></div>
      {editing ? <div className="spn-project-property-fields">{(tab === 'General' ? generalFields : additionalFields).map(({ path: fieldPath, label }) => setField(fieldPath, label))}<div className="spn-project-edit-actions"><button className="spn-button-primary" onClick={save}>Save</button><button className="spn-button-secondary" onClick={() => { setDraft(project); setEditing(false) }}>Cancel</button></div></div> : <div className="spn-project-property-fields">{(tab === 'General' ? generalFields : additionalFields).map(({ path: fieldPath, label }) => <div className="spn-project-property" key={fieldPath}><span>{label}</span><strong>{display(getPath(project, fieldPath))}</strong></div>)}<button className="spn-button-secondary" onClick={startEdit}>Edit Project</button></div>}
    </aside>
  </div>
}
