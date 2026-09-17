import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BRIDGE_TYPES, type BridgeRow } from '../../project/model/types'
import type { ProjectWorkspaceData } from '../../project/model/projectWorkspace'
import type { BearingFamily } from '../../bearing-families/model/types'
import type { FoundationFamily } from '../../foundation-families/model/types'
import type { PierCapFamily } from '../../pier-cap-families/model/types'
import type { PierFamily } from '../../pier-families/model/types'
import { PRECAST_DIMENSIONS, generatePrecastGirderVariants, type GirderVariant } from '../../girder-library/model/variants'
import type { PreferredSpanRule } from '../../preferred-span/model/types'
import { axesFromSpans, assignedAxis } from '../model/store'
import type { AxisFamilyAssignments, BridgeConstraint, BridgeDefinitionStore, BridgeInstanceDefinition, BridgeViewMode, ConstraintKind } from '../model/types'
import LandXmlImportPanel from '../../landxml-import/components/LandXmlImportPanel'
import LongitudinalProfileChart from '../../landxml-import/components/LongitudinalProfileChart'
import { TerrainDtmPanel } from '../../terrain-dtm'
import TerrainViewerPanel from '../../terrain-viewer/components/TerrainViewerPanel'
import { getFamilyRecords, getPrecastGirderDefinition } from '../../family-registry/model/familyRepository'

/**
 * Retained as an internal compatibility/inspection workspace. Bridge Definition is not the
 * future primary project-input workflow; reusable geometry, plan/profile viewers, axis
 * assignments and constraints are candidates for generated-model and alternative inspectors.
 */

type Props = {
  bridges: BridgeRow[]; project: ProjectWorkspaceData; store: BridgeDefinitionStore; setStore: Dispatch<SetStateAction<BridgeDefinitionStore>>
  terrainId: string | null; landXmlImportId: string | null; setTerrainId: Dispatch<SetStateAction<string | null>>; setLandXmlImportId: Dispatch<SetStateAction<string | null>>
}
type FamilyRef = { id: string; name: string }
type Catalogs = { piers: PierFamily[]; pierCaps: PierCapFamily[]; foundations: FoundationFamily[]; bearings: BearingFamily[]; girders: GirderVariant[]; preferred: PreferredSpanRule[] }
const CATALOG_KEYS = {
  preferred: 'spanova.project-design-system.girder-span-rules',
}
const NAV: { group: string; label: string; slug: string }[] = [
  { group: 'Bridge', label: 'Bridge Overview', slug: 'overview' },
  { group: 'Alignment', label: 'Horizontal Alignment', slug: 'alignment/horizontal' }, { group: 'Alignment', label: 'Vertical Alignment', slug: 'alignment/vertical' }, { group: 'Alignment', label: 'Cross Section', slug: 'alignment/cross-section' }, { group: 'Alignment', label: 'Terrain Reference', slug: 'alignment/terrain-reference' },
  { group: 'Span Arrangement', label: 'Span Layout', slug: 'span-arrangement/span-layout' }, { group: 'Span Arrangement', label: 'Axis Definition', slug: 'span-arrangement/axis-definition' },
  { group: 'Superstructure', label: 'Type & Assignment', slug: 'superstructure/type-assignment' }, { group: 'Superstructure', label: 'Deck Geometry', slug: 'superstructure/deck-geometry' }, { group: 'Superstructure', label: 'Girder Layout', slug: 'superstructure/girder-layout' },
  { group: 'Supports', label: 'Pier Layout', slug: 'supports/pier-layout' }, { group: 'Supports', label: 'Pier Cap Assignment', slug: 'supports/pier-cap-assignment' }, { group: 'Supports', label: 'Abutments', slug: 'supports/abutments' },
  { group: 'Foundations', label: 'Foundation Assignment', slug: 'foundations/assignment' }, { group: 'Foundations', label: 'Soil Reference', slug: 'foundations/soil-reference' },
  { group: 'Bearings', label: 'Bearing Layout', slug: 'bearings/layout' }, { group: 'Bearings', label: 'Bearing Assignment', slug: 'bearings/assignment' },
  { group: 'Construction', label: 'Construction Method', slug: 'construction/method' }, { group: 'Construction', label: 'Construction Stages', slug: 'construction/stages' },
  { group: 'Constraints', label: 'Roads / Railways', slug: 'constraints/roads-railways' }, { group: 'Constraints', label: 'Rivers', slug: 'constraints/rivers' }, { group: 'Constraints', label: 'Clearances', slug: 'constraints/clearances' }, { group: 'Constraints', label: 'Geometric Constraints', slug: 'constraints/geometric' },
  { group: 'Assembly', label: 'Bridge Assembly', slug: 'assembly/bridge-assembly' }, { group: 'Assembly', label: 'Validation', slug: 'assembly/validation' },
]
const CONSTRAINT_KIND: Record<string, ConstraintKind> = { 'constraints/roads-railways': 'ROAD_RAILWAY', 'constraints/rivers': 'RIVER', 'constraints/clearances': 'CLEARANCE', 'constraints/geometric': 'OTHER' }
const CONSTRUCTION_METHODS = ['Precast Girder', 'Steel Composite', 'Balanced Cantilever', 'MSS', 'Cast in Situ', 'Other / Custom']

function readCatalog<T>(key: string): T[] { try { const value = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown; return Array.isArray(value) ? value as T[] : [] } catch { return [] } }
function readCatalogs(): Catalogs {
  const dimensions = getPrecastGirderDefinition<{ dimensions?: typeof PRECAST_DIMENSIONS } | null>(null)?.dimensions ?? PRECAST_DIMENSIONS
  return { piers: getFamilyRecords<PierFamily>('PIER'), pierCaps: getFamilyRecords<PierCapFamily>('PIER_CAP'), foundations: getFamilyRecords<FoundationFamily>('FOUNDATION'), bearings: getFamilyRecords<BearingFamily>('BEARING'), girders: generatePrecastGirderVariants(dimensions), preferred: readCatalog<PreferredSpanRule>(CATALOG_KEYS.preferred) }
}
function emptyAssignments(): AxisFamilyAssignments { return assignedAxis() }
function shown(value: string | number | null | undefined) { return value == null || value === '' ? 'Not defined' : String(value) }
function shortId() { return globalThis.crypto?.randomUUID?.() ?? `constraint-${Date.now()}-${Math.random().toString(36).slice(2)}` }

export default function BridgeDefinitionWorkspace({ bridges, project, store, setStore, terrainId, landXmlImportId, setTerrainId, setLandXmlImportId }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const slug = pathname.split('/').slice(2).join('/') || 'overview'
  const selectedItem = NAV.find((item) => item.slug === slug) ?? NAV[0]
  const bridge = bridges.find((item) => item.no === store.selectedBridgeId) ?? bridges[0]
  const definition = bridge ? store.definitions[bridge.no] : undefined
  const [catalogs, setCatalogs] = useState(readCatalogs)
  const [spanText, setSpanText] = useState('')
  const [importingAlignment, setImportingAlignment] = useState(false)
  const [constraintDraft, setConstraintDraft] = useState({ name: '', start: '', end: '' })

  useEffect(() => {
    const refresh = () => setCatalogs(readCatalogs())
    const events = ['storage', 'spanova:pier-catalog-changed', 'spanova:pier-cap-catalog-changed', 'spanova:foundation-catalog-changed', 'spanova:bearing-catalog-changed']
    events.forEach((event) => window.addEventListener(event, refresh))
    return () => events.forEach((event) => window.removeEventListener(event, refresh))
  }, [])
  useEffect(() => { setSpanText(definition?.spanLengthsM.join(', ') ?? '') }, [bridge?.no])

  const axes = definition?.axes ?? []
  const activeAxis = axes.find((axis) => axis.id === definition?.selectedAxisId) ?? axes[0]
  const assignments = activeAxis ? definition?.axisAssignments[activeAxis.id] ?? emptyAssignments() : emptyAssignments()
  const updateDefinition = (patch: Partial<BridgeInstanceDefinition>) => {
    if (!bridge || !definition) return
    setStore((previous) => ({ ...previous, definitions: { ...previous.definitions, [bridge.no]: { ...definition, ...patch } } }))
  }
  const updateSelectedAxis = (patch: Partial<AxisFamilyAssignments>) => {
    if (!definition || !activeAxis) return
    updateDefinition({ axisAssignments: { ...definition.axisAssignments, [activeAxis.id]: { ...emptyAssignments(), ...definition.axisAssignments[activeAxis.id], ...patch } } })
  }
  const setAxisValue = (field: 'elevationM' | 'skewDegrees', value: string) => {
    if (!definition || !activeAxis) return
    const parsed = value.trim() === '' ? null : Number(value)
    if (parsed !== null && !Number.isFinite(parsed)) return
    updateDefinition({ axes: definition.axes.map((axis) => axis.id === activeAxis.id ? { ...axis, [field]: parsed } : axis) })
  }
  const selectBridge = (id: string) => setStore((previous) => ({ ...previous, selectedBridgeId: id }))
  const groups = useMemo(() => NAV.reduce<{ group: string; items: typeof NAV }[]>((result, item) => { let group = result.find((entry) => entry.group === item.group); if (!group) { group = { group: item.group, items: [] }; result.push(group) } group.items.push(item); return result }, []), [])

  if (!bridge || !definition) return <div className="spn-bridge-definition-empty"><h1>Bridge Definition</h1><p>Add a bridge in Project &gt; Bridge Information to configure a bridge instance.</p></div>

  const updateSpans = (value: string) => {
    setSpanText(value)
    const parsed = value.split(',').map((part) => part.trim()).filter(Boolean).map(Number)
    if (value.trim() && (parsed.some((number) => !Number.isFinite(number) || number <= 0))) return
    const spanLengthsM = value.trim() ? parsed : []
    const nextAxes = axesFromSpans(spanLengthsM, definition.axes)
    const axisAssignments = Object.fromEntries(Object.entries(definition.axisAssignments).filter(([id]) => nextAxes.some((axis) => axis.id === id)))
    updateDefinition({ spanLengthsM, axes: nextAxes, axisAssignments, selectedAxisId: definition.selectedAxisId && nextAxes.some((axis) => axis.id === definition.selectedAxisId) ? definition.selectedAxisId : nextAxes[0]?.id ?? null })
  }
  const updateConstraint = (id: string, patch: Partial<BridgeConstraint>) => updateDefinition({ constraints: definition.constraints.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const addConstraint = () => {
    const kind = CONSTRAINT_KIND[slug] ?? 'OTHER'
    if (!constraintDraft.name.trim()) return
    const next: BridgeConstraint = { id: shortId(), kind, name: constraintDraft.name.trim(), startChainageM: constraintDraft.start.trim() ? Number(constraintDraft.start) : null, endChainageM: constraintDraft.end.trim() ? Number(constraintDraft.end) : null, note: '' }
    if ((next.startChainageM !== null && !Number.isFinite(next.startChainageM)) || (next.endChainageM !== null && !Number.isFinite(next.endChainageM))) return
    updateDefinition({ constraints: [...definition.constraints, next] }); setConstraintDraft({ name: '', start: '', end: '' })
  }

  let content: ReactNode
  if (slug === 'alignment/horizontal') {
    content = importingAlignment || !landXmlImportId
      ? <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Horizontal Alignment</h1><p>Existing LandXML import pipeline</p>{landXmlImportId && <button className="spn-button-secondary" onClick={() => setImportingAlignment(false)}>View imported alignment</button>}</div><LandXmlImportPanel title="Alignment / LandXML" projectId={project.id || 'default'} coordinateSystemLabel={project.coordinateSystem || project.coordinate.name || 'Local / Unknown'} onImported={(value) => { setTerrainId(value.terrainId); setLandXmlImportId(value.hasAlignment ? value.landXmlImportId : null); setImportingAlignment(false) }} /></div>
      : <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Horizontal Alignment</h1><p>Shared project alignment reference Â· Import ID: {landXmlImportId}</p><button className="spn-button-secondary" onClick={() => setImportingAlignment(true)}>Import / Replace Alignment</button></div><TerrainViewerPanel terrainId={terrainId} landXmlImportId={landXmlImportId} /><p className="spn-bd-note">The existing viewer displays imported alignment over its source terrain. Alignment geometry remains owned by the LandXML import service.</p></div>
  } else if (slug === 'alignment/vertical') {
    content = landXmlImportId ? <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Vertical Alignment</h1><p>Profile extracted from the selected LandXML alignment</p></div><LongitudinalProfileChart importId={landXmlImportId} /></div> : <EmptyState title="Vertical Alignment" message="No imported alignment/profile is referenced by this project yet." />
  } else if (slug === 'alignment/terrain-reference') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Terrain Reference</h1><p>Terrain is stored at Project level; this bridge references the shared dataset.</p><span>{terrainId ?? 'No terrain dataset referenced'}</span></div><TerrainDtmPanel projectId={project.id || 'default'} coordinateSystemLabel={project.coordinateSystem || project.coordinate.name || 'Local / Unknown'} onImported={(id) => { setTerrainId(id); setLandXmlImportId(null) }} /></div>
  } else if (slug === 'alignment/cross-section') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Cross Section</h1><p>Bridge inventory dimensions and existing Superstructure family reference</p></div><PropertyGrid values={[["Bridge", bridge.no], ["Superstructure type", definition.superstructureType], ["Road / deck width", `${bridge.roadWidthM || 'Not defined'} m`], ["Bridge-specific width override", definition.deckWidthOverrideM == null ? 'Not defined' : `${definition.deckWidthOverrideM} m`]]} /></div>
  } else if (slug === 'span-arrangement/span-layout') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Span Layout</h1><p>Selected bridge instance Â· {bridge.no}</p></div><div className="spn-bd-property-grid"><label className="spn-field"><span>Individual selected span lengths (m), comma separated</span><input className="spn-input" aria-label="Selected span lengths" value={spanText} onChange={(event) => updateSpans(event.target.value)} placeholder="Not defined" /></label><div className="spn-bd-fact"><span>Project Information span alternatives</span><strong>{bridge.spansM.length ? bridge.spansM.join(', ') + ' m' : 'Not defined'}</strong></div><div className="spn-bd-fact"><span>Estimated inventory length</span><strong>{bridge.estimatedLengthM || 'Not defined'} m</strong></div><div className="spn-bd-fact"><span>Selected total span length</span><strong>{definition.spanLengthsM.length ? `${definition.spanLengthsM.reduce((sum, value) => sum + value, 0)} m` : 'Not defined'}</strong></div></div><p className="spn-bd-note">The inventory span values are alternatives, not a selected span sequence. Enter the bridge-instance arrangement here. The Layout Generator remains the candidate search tool.</p>{axes.length > 0 && <AxisTable axes={axes} selectedId={definition.selectedAxisId} onSelect={(id) => updateDefinition({ selectedAxisId: id })} />}</div>
  } else if (slug === 'span-arrangement/axis-definition') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Axis Definition</h1><p>Support axes derived from the selected individual spans</p></div><AxisTable axes={axes} selectedId={definition.selectedAxisId} onSelect={(id) => updateDefinition({ selectedAxisId: id })} /><p className="spn-bd-note">Axis chainages are cumulative from A1 using the entered span lengths; elevation and skew remain explicit bridge inputs.</p></div>
  } else if (slug === 'superstructure/type-assignment') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Superstructure Type & Assignment</h1><p>Bridge-instance type assignment. Family geometry remains in Family Tables.</p></div><label className="spn-field" style={{ maxWidth: 420 }}><span>Superstructure Type</span><select className="spn-input" value={definition.superstructureType} onChange={(event) => updateDefinition({ superstructureType: event.target.value })}>{BRIDGE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><p className="spn-bd-note">No Superstructure Family records with stable IDs exist in the current catalog. The selected type is stored without copying family geometry.</p></div>
  } else if (slug === 'superstructure/deck-geometry') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Deck Geometry</h1><p>Project inventory width is used unless an explicit bridge-level override is entered.</p></div><div className="spn-bd-property-grid"><div className="spn-bd-fact"><span>Inventory road width</span><strong>{bridge.roadWidthM || 'Not defined'} m</strong></div><label className="spn-field"><span>Deck width override (m)</span><input className="spn-input" type="number" value={definition.deckWidthOverrideM ?? ''} onChange={(event) => updateDefinition({ deckWidthOverrideM: event.target.value === '' ? null : Number(event.target.value) })} placeholder="Use inventory width" /></label><button className="spn-button-secondary" onClick={() => updateDefinition({ deckWidthOverrideM: null })}>Use inventory width</button></div></div>
  } else if (slug === 'superstructure/girder-layout') {
    const selectedGirder = catalogs.girders.find((item) => item.id === definition.girderVariantId)
    const preferred = catalogs.preferred.find((item) => item.girderVariantId === selectedGirder?.id && item.enabled)
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Girder Layout</h1><p>Girder references use existing Girder Library variant IDs.</p></div><div className="spn-bd-property-grid"><label className="spn-field"><span>Girder Variant</span><select className="spn-input" value={definition.girderVariantId ?? ''} onChange={(event) => { const item = catalogs.girders.find((variant) => variant.id === event.target.value); updateDefinition({ girderVariantId: item?.id ?? null, girderFamilyId: item?.familyId ?? null }) }}><option value="">Not assigned</option>{catalogs.girders.map((item) => <option key={item.id} value={item.id}>{item.label} Â· {item.familyId}</option>)}</select></label><label className="spn-field"><span>Girder Count</span><input className="spn-input" type="number" value={definition.girderCount ?? ''} onChange={(event) => updateDefinition({ girderCount: event.target.value === '' ? null : Number(event.target.value) })} placeholder="Not defined" /></label><div className="spn-bd-fact"><span>Family ID reference</span><strong>{definition.girderFamilyId ?? 'Not assigned'}</strong></div><div className="spn-bd-fact"><span>Preferred Span rule</span><strong>{preferred?.enabled && preferred.maxSpan > preferred.minSpan ? `${preferred.minSpan}â€“${preferred.maxSpan} m` : 'No valid rule for this variant'}</strong></div></div></div>
  } else if (slug.startsWith('supports/') || slug.startsWith('foundations/') || slug.startsWith('bearings/')) {
    const isPier = slug === 'supports/pier-layout'
    const isPierCap = slug === 'supports/pier-cap-assignment'
    const isAbutment = slug === 'supports/abutments'
    const isFoundation = slug.startsWith('foundations/')
    const isBearing = slug.startsWith('bearings/')
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>{selectedItem.label}</h1><p>Choose a support axis, then assign existing family IDs in the Inspector.</p></div><AxisTable axes={axes.filter((axis) => isAbutment ? axis.type === 'ABUTMENT' : !isPier || axis.type === 'PIER')} selectedId={definition.selectedAxisId} onSelect={(id) => updateDefinition({ selectedAxisId: id })} />{activeAxis && (isFoundation ? <div className="spn-bd-property-grid"><div className="spn-bd-fact"><span>Selected Foundation Family</span><strong>{familyName(catalogs.foundations, assignments.foundationFamilyId)}</strong></div><div className="spn-bd-fact"><span>Foundation elevation</span><strong>{shown(assignments.foundationElevationM)}</strong></div><div className="spn-bd-fact"><span>Soil reference</span><strong>{shown(assignments.soilReference)}</strong></div></div> : isBearing ? <div className="spn-bd-property-grid"><div className="spn-bd-fact"><span>Selected Bearing Family</span><strong>{familyName(catalogs.bearings, assignments.bearingFamilyId)}</strong></div><div className="spn-bd-fact"><span>Quantity</span><strong>{shown(assignments.bearingQuantity)}</strong></div><div className="spn-bd-fact"><span>Orientation</span><strong>{shown(assignments.bearingOrientation)}</strong></div></div> : isAbutment ? <p className="spn-bd-note">No Abutment Family catalog/editor exists in the current SPANOVA source. A family reference will remain unset until Family Tables defines stable IDs.</p> : isPierCap ? <div className="spn-bd-property-grid"><div className="spn-bd-fact"><span>Selected Pier Cap Family</span><strong>{familyName(catalogs.pierCaps, assignments.pierCapFamilyId)}</strong></div></div> : <div className="spn-bd-property-grid"><div className="spn-bd-fact"><span>Selected Pier Family</span><strong>{familyName(catalogs.piers, assignments.pierFamilyId)}</strong></div><div className="spn-bd-fact"><span>Bridge-specific pier height</span><strong>{shown(assignments.pierHeightM)}</strong></div></div>)}{isPier && activeAxis && <p className="spn-bd-note">Pier section geometry is referenced by family ID; only this bridge axis height is stored here.</p>}</div>
  } else if (slug === 'construction/method') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Construction Method</h1><p>Bridge-level selection only; no construction-stage analysis.</p></div><label className="spn-field" style={{ maxWidth: 420 }}><span>Method</span><select className="spn-input" value={definition.constructionMethod} onChange={(event) => updateDefinition({ constructionMethod: event.target.value })}><option value="">Not defined</option>{CONSTRUCTION_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label></div>
  } else if (slug === 'construction/stages') {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>Construction Stages</h1><p>Descriptive bridge-level note only; construction-stage analysis is not implemented.</p></div><label className="spn-field"><span>Construction note</span><textarea className="spn-input" rows={5} value={definition.constructionStagesNote} onChange={(event) => updateDefinition({ constructionStagesNote: event.target.value })} /></label></div>
  } else if (slug.startsWith('constraints/')) {
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>{selectedItem.label}</h1><p>Bridge-local chainage references; no clearance or feasibility calculation is applied here.</p></div><div className="spn-bd-constraint-form"><label className="spn-field"><span>Constraint name</span><input className="spn-input" value={constraintDraft.name} onChange={(event) => setConstraintDraft({ ...constraintDraft, name: event.target.value })} /></label><label className="spn-field"><span>Start chainage (m)</span><input className="spn-input" type="number" value={constraintDraft.start} onChange={(event) => setConstraintDraft({ ...constraintDraft, start: event.target.value })} /></label><label className="spn-field"><span>End chainage (m)</span><input className="spn-input" type="number" value={constraintDraft.end} onChange={(event) => setConstraintDraft({ ...constraintDraft, end: event.target.value })} /></label><button className="spn-button-secondary" onClick={addConstraint}>Add reference</button></div><ConstraintTable items={definition.constraints.filter((item) => item.kind === (CONSTRAINT_KIND[slug] ?? 'OTHER'))} onUpdate={updateConstraint} onRemove={(id) => updateDefinition({ constraints: definition.constraints.filter((item) => item.id !== id) })} /></div>
  } else if (slug.startsWith('assembly/')) {
    const required = [{ label: 'Span layout', configured: definition.spanLengthsM.length > 0 }, { label: 'Superstructure type', configured: Boolean(definition.superstructureType) }, { label: 'Girder family', configured: Boolean(definition.girderFamilyId) }, { label: 'Pier axes assigned', configured: axes.filter((axis) => axis.type === 'PIER').length > 0 && axes.filter((axis) => axis.type === 'PIER').every((axis) => Boolean(definition.axisAssignments[axis.id]?.pierFamilyId)) }, { label: 'Foundation axes assigned', configured: axes.filter((axis) => axis.type === 'PIER').length > 0 && axes.filter((axis) => axis.type === 'PIER').every((axis) => Boolean(definition.axisAssignments[axis.id]?.foundationFamilyId)) }]
    content = <div className="spn-bd-editor"><div className="spn-bd-editor-title"><h1>{selectedItem.label}</h1><p>Configuration inventory only; this is not an engineering validation.</p></div><table className="spn-table"><thead><tr><th>Bridge component</th><th>Configuration</th></tr></thead><tbody>{required.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.configured ? 'Configured' : 'Not configured'}</td></tr>)}<tr><td>Abutment family catalog</td><td>Not available in current Family Tables</td></tr><tr><td>Engineering validation</td><td>Not implemented</td></tr></tbody></table></div>
  } else {
    const axisCount = axes.length
    content = <div className="spn-bd-view"><div className="spn-bd-view-toolbar"><div><strong>{bridge.no}</strong><span>{bridge.crossingType} Â· {axisCount ? `${axisCount} support axes` : 'span layout not defined'}</span></div><div className="spn-bd-view-modes">{(['3D', 'PLAN', 'PROFILE'] as BridgeViewMode[]).map((mode) => <button key={mode} className={definition.viewMode === mode ? 'active' : ''} onClick={() => updateDefinition({ viewMode: mode })}>{mode === 'PLAN' ? 'Plan' : mode === 'PROFILE' ? 'Profile' : '3D'}</button>)}</div></div>{definition.viewMode === '3D' ? terrainId && definition.terrainVisible ? <TerrainViewerPanel terrainId={terrainId} landXmlImportId={landXmlImportId} /> : <EmptyState title="3D View" message="No project terrain dataset is loaded. Import terrain from Alignment > Terrain Reference." /> : definition.viewMode === 'PLAN' ? <BridgeSchematic definition={definition} bridge={bridge} view="PLAN" /> : <BridgeSchematic definition={definition} bridge={bridge} view="PROFILE" />}</div>
  }

  return <div className="spn-bridge-definition-shell">
    <aside className="spn-bridge-tree" aria-label="Bridge Definition sections"><label className="spn-field"><span>Bridge</span><select aria-label="Bridge selector" className="spn-input" value={bridge.no} onChange={(event) => selectBridge(event.target.value)}>{bridges.map((item) => <option key={item.no} value={item.no}>{item.no} Â· {item.bridgeType}</option>)}</select></label>{groups.map((group) => <div key={group.group} className="spn-bd-nav-group"><div>{group.group}</div>{group.items.map((item) => <button key={item.slug} className={item.slug === slug ? 'active' : ''} onClick={() => navigate(item.slug === 'overview' ? '/bridge-definition' : `/bridge-definition/${item.slug}`)}>{item.label}</button>)}</div>)}</aside>
    <main className="spn-bridge-center">{slug === 'overview' ? <div className="spn-bd-view"><div className="spn-bd-view-toolbar"><div><strong>{bridge.no}</strong><span>{bridge.crossingType} Â· estimated inventory length {bridge.estimatedLengthM} m</span></div><div className="spn-bd-view-modes">{(['3D', 'PLAN', 'PROFILE'] as BridgeViewMode[]).map((mode) => <button key={mode} className={definition.viewMode === mode ? 'active' : ''} onClick={() => updateDefinition({ viewMode: mode })}>{mode === 'PLAN' ? 'Plan' : mode === 'PROFILE' ? 'Profile' : '3D'}</button>)}</div></div>{definition.viewMode === '3D' ? terrainId && definition.terrainVisible ? <TerrainViewerPanel terrainId={terrainId} landXmlImportId={landXmlImportId} /> : <EmptyState title="3D View" message="No project terrain dataset is loaded. Import terrain from Alignment > Terrain Reference." /> : <BridgeSchematic definition={definition} bridge={bridge} view={definition.viewMode} />}</div> : content}</main>
    <aside className="spn-bridge-inspector" aria-label="Bridge Definition Inspector">
      <header>INSPECTOR</header>
      <div className="spn-bd-inspector-content">
        <div className="spn-bd-inspector-section">
          {activeAxis ? <>
            <h2>{activeAxis.type === 'PIER' ? 'Pier Axis Properties' : 'Abutment Axis Properties'}</h2>
            <strong>{activeAxis.name}</strong>
            <ReadOnly label="Chainage" value={`${activeAxis.chainageM} m`} />
            <InspectorInput label="Elevation (m)" value={activeAxis.elevationM} onChange={(value) => setAxisValue('elevationM', value)} />
            <InspectorInput label="Skew (deg)" value={activeAxis.skewDegrees} onChange={(value) => setAxisValue('skewDegrees', value)} />
            {activeAxis.type === 'PIER' && <>
              <FamilySelect label="Pier Family" value={assignments.pierFamilyId} items={catalogs.piers} onChange={(value) => updateSelectedAxis({ pierFamilyId: value })} />
              <InspectorInput label="Pier Height (m)" value={assignments.pierHeightM} onChange={(value) => updateSelectedAxis({ pierHeightM: numeric(value) })} />
              <FamilySelect label="Pier Cap Family" value={assignments.pierCapFamilyId} items={catalogs.pierCaps} onChange={(value) => updateSelectedAxis({ pierCapFamilyId: value })} />
            </>}
            <FamilySelect label="Foundation Family" value={assignments.foundationFamilyId} items={catalogs.foundations} onChange={(value) => updateSelectedAxis({ foundationFamilyId: value })} />
            <InspectorInput label="Foundation Elevation (m)" value={assignments.foundationElevationM} onChange={(value) => updateSelectedAxis({ foundationElevationM: numeric(value) })} />
            <InspectorText label="Soil Reference" value={assignments.soilReference} onChange={(value) => updateSelectedAxis({ soilReference: value })} />
            <FamilySelect label="Bearing Family" value={assignments.bearingFamilyId} items={catalogs.bearings} onChange={(value) => updateSelectedAxis({ bearingFamilyId: value })} />
            <InspectorInput label="Bearing Quantity" value={assignments.bearingQuantity} onChange={(value) => updateSelectedAxis({ bearingQuantity: numeric(value) })} />
            <InspectorText label="Bearing Orientation" value={assignments.bearingOrientation} onChange={(value) => updateSelectedAxis({ bearingOrientation: value })} />
            <InspectorSelect label="Longitudinal Behavior" value={assignments.longitudinalBehavior} options={['Fixed', 'Guided', 'Free']} onChange={(value) => updateSelectedAxis({ longitudinalBehavior: value })} />
            <InspectorSelect label="Transverse Behavior" value={assignments.transverseBehavior} options={['Fixed', 'Guided', 'Free']} onChange={(value) => updateSelectedAxis({ transverseBehavior: value })} />
            {activeAxis.type === 'ABUTMENT' && <p className="spn-bd-note">Abutment family assignment is unavailable because the current Family Tables catalog has no stable Abutment Family IDs.</p>}
          </> : <>
            <h2>{selectedItem.group}</h2>
            <p>{selectedItem.label}</p>
            <ReadOnly label="Selected bridge" value={bridge.no} />
            <ReadOnly label="Superstructure type" value={definition.superstructureType} />
            {definition.spanLengthsM.map((length, index) => <ReadOnly key={index} label={`Span ${index + 1}`} value={`${length} m`} />)}
          </>}
        </div>
      </div>
    </aside>
  </div>
}

function familyName(items: FamilyRef[], id: string | null) { return items.find((item) => item.id === id)?.name ?? (id ? `Missing family: ${id}` : 'Not assigned') }
function numeric(value: string): number | null { if (value.trim() === '') return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null }
function EmptyState({ title, message }: { title: string; message: string }) { return <div className="spn-bd-empty"><strong>{title}</strong><span>{message}</span></div> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="spn-bd-readonly"><span>{label}</span><strong>{value}</strong></div> }
function InspectorInput({ label, value, onChange }: { label: string; value: number | null; onChange: (value: string) => void }) { return <label className="spn-field"><span>{label}</span><input className="spn-input" type="number" value={value ?? ''} placeholder="Not defined" onChange={(event) => onChange(event.target.value)} /></label> }
function InspectorText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="spn-field"><span>{label}</span><input className="spn-input" value={value} placeholder="Not defined" onChange={(event) => onChange(event.target.value)} /></label> }
function InspectorSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="spn-field"><span>{label}</span><select className="spn-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Not defined</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
function FamilySelect<T extends FamilyRef>({ label, value, items, onChange }: { label: string; value: string | null; items: T[]; onChange: (value: string | null) => void }) { return <label className="spn-field"><span>{label}</span><select className="spn-input" value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}><option value="">Not assigned</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} Â· {item.id}</option>)}</select></label> }
function AxisTable({ axes, selectedId, onSelect }: { axes: BridgeInstanceDefinition['axes']; selectedId: string | null; onSelect: (id: string) => void }) { return axes.length ? <table className="spn-table spn-bd-axis-table"><thead><tr><th>Axis</th><th>Type</th><th>Chainage (m)</th><th>Elevation (m)</th><th>Skew (deg)</th></tr></thead><tbody>{axes.map((axis) => <tr key={axis.id} className={axis.id === selectedId ? 'spn-row-selected' : ''} onClick={() => onSelect(axis.id)}><td>{axis.name}</td><td>{axis.type}</td><td>{axis.chainageM}</td><td>{axis.elevationM ?? 'â€”'}</td><td>{axis.skewDegrees ?? 'â€”'}</td></tr>)}</tbody></table> : <EmptyState title="Support axes not defined" message="Enter an individual span arrangement to derive A1, pier, and A2 chainages." /> }
function PropertyGrid({ values }: { values: [string, string][] }) { return <div className="spn-bd-property-grid">{values.map(([label, value]) => <div className="spn-bd-fact" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> }
function ConstraintTable({ items, onUpdate, onRemove }: { items: BridgeConstraint[]; onUpdate: (id: string, patch: Partial<BridgeConstraint>) => void; onRemove: (id: string) => void }) { return items.length ? <table className="spn-table"><thead><tr><th>Name</th><th>Start (m)</th><th>End (m)</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><input className="spn-input" value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} /></td><td><input className="spn-input" type="number" value={item.startChainageM ?? ''} onChange={(event) => onUpdate(item.id, { startChainageM: numeric(event.target.value) })} /></td><td><input className="spn-input" type="number" value={item.endChainageM ?? ''} onChange={(event) => onUpdate(item.id, { endChainageM: numeric(event.target.value) })} /></td><td><button className="spn-button-secondary" onClick={() => onRemove(item.id)}>Remove</button></td></tr>)}</tbody></table> : <p className="spn-bd-note">No bridge-local reference constraints entered.</p> }
function BridgeSchematic({ definition, bridge, view }: { definition: BridgeInstanceDefinition; bridge: BridgeRow; view: BridgeViewMode }) {
  const total = definition.spanLengthsM.reduce((sum, span) => sum + span, 0)
  if (!total || !definition.axes.length) return <EmptyState title={`${view === 'PLAN' ? 'Plan' : 'Profile'} view`} message="Enter the individual span arrangement to display this bridge instance." />
  const left = 72, right = 928, width = right - left
  const deckWidth = definition.deckWidthOverrideM ?? bridge.roadWidthM
  return <div className="spn-bd-schematic-wrap"><svg className="spn-bd-schematic" viewBox="0 0 1000 440" role="img" aria-label={`Bridge ${view.toLowerCase()} view for ${bridge.no}`}>
    {view === 'PLAN' ? <><text x="72" y="52">PLAN Â· {bridge.no}</text><rect x={left} y="156" width={width} height="120" /><text x="500" y="328" textAnchor="middle">Deck width: {deckWidth || 'Not defined'} m</text>{definition.axes.map((axis) => <g key={axis.id}><line x1={left + axis.chainageM / total * width} x2={left + axis.chainageM / total * width} y1="140" y2="292" /><text x={left + axis.chainageM / total * width} y="126" textAnchor="middle">{axis.name}</text></g>)}</>
      : <><text x="72" y="52">PROFILE Â· {bridge.no}</text><line x1={left} y1="278" x2={right} y2="278" className="deck-line" /><text x="500" y="342" textAnchor="middle">Span arrangement: {definition.spanLengthsM.join(' Â· ')} m</text>{definition.axes.map((axis) => <g key={axis.id}><line x1={left + axis.chainageM / total * width} x2={left + axis.chainageM / total * width} y1="210" y2="294" /><text x={left + axis.chainageM / total * width} y="188" textAnchor="middle">{axis.name}</text></g>)}</>}
  </svg><p>Schematic derived from the selected bridge span and axis state; no unprovided vertical geometry is implied.</p></div>
}
