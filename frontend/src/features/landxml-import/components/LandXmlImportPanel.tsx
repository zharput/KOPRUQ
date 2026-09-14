import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInspectLandXml } from '../hooks/useInspectLandXml'
import { useImportLandXml } from '../hooks/useImportLandXml'
import type { CoordinateOrder } from '../api/landXmlImportService'
import { TerrainPreview } from '../../terrain-viewer'
import LongitudinalProfileChart from './LongitudinalProfileChart'

/** Shared terrain/alignment import: explicit surface and coordinate mapping, one canonical pipeline. */
export default function LandXmlImportPanel({ onImported, initialFile, title = 'Alignment / LandXML' }: {
  onImported: (result: { terrainId: string; landXmlImportId: string; hasAlignment: boolean }) => void
  initialFile?: File
  title?: string
}) {
  const [file, setFile] = useState<File | null>(initialFile ?? null)
  const [coordinateSystemLabel, setCoordinateSystemLabel] = useState('Local / Unknown')
  const [coordinateOrder, setCoordinateOrder] = useState<CoordinateOrder | ''>('')
  const [surface, setSurface] = useState('')
  const [alignment, setAlignment] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const inspect = useInspectLandXml()
  const commit = useImportLandXml()
  const inspectFile = inspect.mutate
  const inspectedFile = useRef<File | null>(null)

  useEffect(() => {
    if (file && inspectedFile.current !== file) {
      inspectedFile.current = file
      inspectFile(file, { onSuccess: (result) => {
        setSurface(result.surfaceNames.length === 1 ? result.surfaceNames[0] : '')
        setCoordinateSystemLabel(result.crsLabel ?? 'Local / Unknown')
      } })
    }
  }, [file, inspectFile])

  function selectFile(next: File) {
    commit.reset(); inspect.reset(); setSurface(''); setAlignment(''); setCoordinateOrder('')
    setCoordinateSystemLabel('Local / Unknown'); setFile(next)
  }
  const data = inspect.data
  const preview = data?.surfaces.find((s) => s.name === surface)
  const result = commit.data
  const busy = inspect.isPending || commit.isPending

  function importSelection() {
    if (!file || !surface || !coordinateOrder) return
    commit.mutate({ file, projectId: 'default', coordinateSystemLabel, surfaceName: surface,
      alignmentName: alignment || null, coordinateOrder }, {
      onSuccess: (value) => onImported({ terrainId: value.terrainId, landXmlImportId: value.id, hasAlignment: value.hasAlignment }),
    })
  }

  return <div className="spn-home">
    <h1>{title}</h1>
    <p className="spn-home-intro">Import the source LandXML TIN. Review source coordinates and confirm their X/Y mapping before import. No reprojection is performed.</p>
    <div className="spn-card">
      <button type="button" className="spn-button-secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
        {inspect.isPending ? 'Reading source...' : 'Import Terrain'}
      </button>
      <input ref={fileInput} type="file" accept=".xml,.landxml" hidden onChange={(event) => {
        const next = event.target.files?.[0]; if (next) selectFile(next); event.target.value = ''
      }} />
      <p>{file?.name}</p>
      {inspect.isError && <p className="spn-error">{inspect.error.message}</p>}
      {data && <>
        <p>Source: {data.application ?? 'not declared'} | LandXML {data.formatVersion} | Units: {data.unitsLabel ?? 'unknown'}</p>
        <div className="spn-field-grid">
          <label className="spn-field"><span>Surface</span><select className="spn-input" value={surface} disabled={busy} onChange={(event) => setSurface(event.target.value)}>
            <option value="">Select surface</option>{data.surfaceNames.map((name) => <option key={name}>{name}</option>)}
          </select></label>
          <label className="spn-field"><span>Source coordinate mapping (required)</span><select className="spn-input" value={coordinateOrder} disabled={busy} onChange={(event) => setCoordinateOrder(event.target.value as CoordinateOrder)}>
            <option value="">Confirm against survey coordinates</option>
            <option value="FIRST_Y_SECOND_X">Coordinate 1 = Y; coordinate 2 = X; elevation = Z</option>
            <option value="FIRST_X_SECOND_Y">Coordinate 1 = X; coordinate 2 = Y; elevation = Z</option>
          </select></label>
          <label className="spn-field"><span>CRS label (unknown remains REVIEW_REQUIRED)</span><input className="spn-input" value={coordinateSystemLabel} disabled={busy} onChange={(event) => setCoordinateSystemLabel(event.target.value)} /></label>
          {data.alignmentNames.length > 0 && <label className="spn-field"><span>Alignment (optional; requires coordinate 1=Y)</span><select className="spn-input" value={alignment} disabled={busy} onChange={(event) => setAlignment(event.target.value)}>
            <option value="">None - terrain only</option>{data.alignmentNames.map((name) => <option key={name}>{name}</option>)}
          </select></label>}
        </div>
        {preview && <>
          <p>Points: {preview.points.toLocaleString()} | Faces: {preview.faces.toLocaleString()} | Outer: {preview.outerBoundaries} | Voids: {preview.voidBoundaries} | Breaklines: {preview.breaklines.toLocaleString()}</p>
          {preview.sourceBounds && <table className="spn-table"><thead><tr><th>Source axis</th><th>Minimum</th><th>Maximum</th></tr></thead><tbody>
            {['Coordinate 1', 'Coordinate 2', 'Elevation'].map((axis, i) => <tr key={axis}><td>{axis}</td><td>{preview.sourceBounds![2*i]}</td><td>{preview.sourceBounds![2*i+1]}</td></tr>)}
          </tbody></table>}
          <table className="spn-table"><thead><tr><th>Source point ID</th><th>Coordinate 1</th><th>Coordinate 2</th><th>Elevation</th></tr></thead><tbody>
            {preview.sourcePoints.map((p,i) => <tr key={i}><td>{p.id}</td><td>{p.coordinate1}</td><td>{p.coordinate2}</td><td>{p.elevation}</td></tr>)}
          </tbody></table>
          {preview.faces === 0 && <p className="spn-error">TIN_TOPOLOGY_MISSING: this surface has no source Faces.</p>}
        </>}
        {data.warnings.map((warning,i) => <p className="spn-card-subtitle" key={i}>{warning}</p>)}
        <button type="button" className="spn-button-primary" disabled={busy || !surface || !coordinateOrder || !preview?.faces || data.unitsLabel?.toLowerCase() !== 'meter'} onClick={importSelection}>
          {commit.isPending ? 'Validating and importing...' : 'Import selected TIN'}
        </button>
        {data.unitsLabel?.toLowerCase() !== 'meter' && <p className="spn-error">UNSUPPORTED_UNITS: this import requires explicitly declared meter units.</p>}
      </>}
      {commit.isError && <p className="spn-error">{commit.error.message}</p>}
    </div>
    {result && <>
      <div className="spn-card">
        <h2>Import summary - {result.status}</h2>
        <p>{result.source.application} | LandXML {result.source.formatVersion} | {result.source.units} | {result.source.surfaceName}</p>
        <p>Points: {result.pointCount.toLocaleString()} / source {result.source.sourcePointCount.toLocaleString()} | Triangles: {result.triangleCount.toLocaleString()} / source {result.source.sourceFaceCount.toLocaleString()}</p>
        <p>Outer boundaries: {result.outerBoundaries} | Void boundaries: {result.voidBoundaries} | Breaklines: {result.breaklines.toLocaleString()}</p>
        <p>Mapping: {result.source.coordinateOrder}</p>
        <p>X [{result.boundsMin.x}, {result.boundsMax.x}] | Y [{result.boundsMin.y}, {result.boundsMax.y}] | Z [{result.boundsMin.z}, {result.boundsMax.z}] m</p>
        <p>Invalid points: {result.source.invalidPoints} | Duplicate point IDs: {result.source.duplicatePointIds} | Invalid faces: {result.source.invalidFaces} | Missing references: {result.source.missingPointReferences} | Degenerate faces: {result.source.degenerateFaces}</p>
        {result.warnings.map((warning,i) => <p className="spn-card-subtitle" key={i}>{warning}</p>)}
        <p className="spn-card-subtitle">Imported terrain is held in server memory; restarting the backend clears it.</p>
      </div>
      <div className="spn-card"><Link to="/3d-visualization">Open full viewer</Link><TerrainPreview key={result.terrainId} terrainId={result.terrainId} /></div>
      {result.hasProfile && <LongitudinalProfileChart importId={result.id} />}
    </>}
  </div>
}
