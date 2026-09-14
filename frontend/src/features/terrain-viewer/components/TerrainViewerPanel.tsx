import { useEffect, useMemo, useState } from 'react'
import DecimalInput from '../../../shared/ui/DecimalInput'
import { useTerrainMesh } from '../hooks/useTerrainMesh'
import { useAlignmentSample } from '../hooks/useAlignmentSample'
import { useImportedAlignmentSample } from '../hooks/useImportedAlignmentSample'
import TerrainMesh, { type TerrainSelection } from './TerrainMesh'
import AlignmentOverlay from './AlignmentOverlay'
import TerrainCanvasFrame from './TerrainCanvasFrame'

/**
 * "3D & Visualization" (TERRAIN-P01, docs/roadmap.md) - the sidebar leaf
 * that already existed as a named-but-empty `PlaceholderPanel`
 * ("Three.js/react-three-fiber... deliberately deferred until a
 * milestone actually needs 3D") now has real content: the imported
 * terrain's mesh, an alignment overlay draped onto it, orbit/pan/zoom,
 * click-to-inspect elevation, and a "fit to terrain" camera action -
 * exactly the engineer's own scoped first milestone (DTM -> Java
 * TerrainModel -> elevation query -> React Three Fiber mesh -> alignment
 * overlay). No satellite imagery, no bridge geometry, no LOD/tiling yet
 * - see docs/roadmap.md's TERRAIN-P02+ entries.
 *
 * <p>**Two alignment sources** (LANDXML-P01): when `landXmlImportId` is
 * given (a real LandXML alignment was imported - possibly including
 * circular arcs), that real geometry is sampled and shown, with no
 * manual input needed. Otherwise (a plain XYZ terrain, no alignment
 * imported), the manual start/end (x,y) fields default to the terrain's
 * own bounding-box diagonal (an honest, literal "corner to corner
 * across the imported data" default, not an invented alignment) and
 * stay editable - this was this screen's only alignment input before
 * LandXML import existed, and remains available for a terrain-only
 * import.
 */
export default function TerrainViewerPanel({
  terrainId,
  landXmlImportId,
}: {
  terrainId: string | null
  landXmlImportId: string | null
}) {
  const meshQuery = useTerrainMesh(terrainId)
  const mesh = meshQuery.data

  const bounds = useMemo(() => {
    if (!mesh) return null
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i] + mesh.localOrigin.x
      const y = mesh.positions[i + 1] + mesh.localOrigin.y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    return { minX, maxX, minY, maxY }
  }, [mesh])

  const [alignmentStartX, setAlignmentStartX] = useState<number | null>(null)
  const [alignmentStartY, setAlignmentStartY] = useState<number | null>(null)
  const [alignmentEndX, setAlignmentEndX] = useState<number | null>(null)
  const [alignmentEndY, setAlignmentEndY] = useState<number | null>(null)

  useEffect(() => {
    if (bounds && alignmentStartX == null) {
      setAlignmentStartX(bounds.minX)
      setAlignmentStartY(bounds.minY)
      setAlignmentEndX(bounds.maxX)
      setAlignmentEndY(bounds.maxY)
    }
    // Only seed once when a terrain first loads - not on every bounds recompute (which would fight manual edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds])

  const [showAlignment, setShowAlignment] = useState(false)
  const manualAlignmentParams =
    showAlignment && !landXmlImportId && alignmentStartX != null && alignmentStartY != null && alignmentEndX != null && alignmentEndY != null
      ? { startXM: alignmentStartX, startYM: alignmentStartY, endXM: alignmentEndX, endYM: alignmentEndY, stepM: 0 }
      : null
  const manualAlignmentQuery = useAlignmentSample(manualAlignmentParams)
  const importedAlignmentQuery = useImportedAlignmentSample(showAlignment ? landXmlImportId : null)
  const alignmentSamples = landXmlImportId ? importedAlignmentQuery.data : manualAlignmentQuery.data

  const [selection, setSelection] = useState<TerrainSelection | null>(null)

  if (!terrainId) {
    return (
      <div className="spn-home">
        <h1>3D &amp; Visualization</h1>
        <p className="spn-home-empty">
          No terrain imported yet - go to Site &amp; Corridor &gt; 3D Terrain / DTM (or Alignment, for a LandXML
          import) first.
        </p>
      </div>
    )
  }

  if (meshQuery.isPending) {
    return (
      <div className="spn-home">
        <h1>3D &amp; Visualization</h1>
        <p className="spn-home-intro">Loading terrain mesh...</p>
      </div>
    )
  }

  if (meshQuery.isError || !mesh) {
    return (
      <div className="spn-home">
        <h1>3D &amp; Visualization</h1>
        <p className="spn-error">
          {meshQuery.error instanceof Error ? meshQuery.error.message : 'Could not load the terrain mesh.'}
        </p>
      </div>
    )
  }

  return (
    <div className="spn-home">
      <h1>3D &amp; Visualization</h1>
      <p className="spn-home-intro">
        TERRAIN-P01/LANDXML-P01: the imported terrain, rendered live, with an alignment draped onto it. No satellite
        imagery, no bridge geometry, no LOD/tiling yet.
      </p>

      <label><input type="checkbox" checked={showAlignment} onChange={(event) => setShowAlignment(event.target.checked)} /> Show alignment overlay</label>
      {showAlignment && !landXmlImportId && (
        <div className="spn-field-grid" style={{ maxWidth: 640, marginBottom: 12 }}>
          <label className="spn-field">
            <span>Alignment start X (m)</span>
            {alignmentStartX != null && <DecimalInput value={alignmentStartX} onChange={(v) => setAlignmentStartX(v)} />}
          </label>
          <label className="spn-field">
            <span>Alignment start Y (m)</span>
            {alignmentStartY != null && <DecimalInput value={alignmentStartY} onChange={(v) => setAlignmentStartY(v)} />}
          </label>
          <label className="spn-field">
            <span>Alignment end X (m)</span>
            {alignmentEndX != null && <DecimalInput value={alignmentEndX} onChange={(v) => setAlignmentEndX(v)} />}
          </label>
          <label className="spn-field">
            <span>Alignment end Y (m)</span>
            {alignmentEndY != null && <DecimalInput value={alignmentEndY} onChange={(v) => setAlignmentEndY(v)} />}
          </label>
        </div>
      )}

      <div className="spn-card" style={{ padding: 0, overflow: 'hidden' }}>
        <TerrainCanvasFrame height={520} mesh={mesh}>
          <TerrainMesh mesh={mesh} onSelect={setSelection} />
          {showAlignment && alignmentSamples && (
            <AlignmentOverlay
              terrainId={terrainId}
              samples={alignmentSamples}
              localOrigin={mesh.localOrigin}
            />
          )}
        </TerrainCanvasFrame>
      </div>

      <div className="spn-card" style={{ marginTop: 12 }}>
        <h2 className="spn-card-title">Selected point</h2>
        {selection ? (
          <p className="spn-card-subtitle">
            X {selection.xM.toFixed(2)} m, Y {selection.yM.toFixed(2)} m - elevation{' '}
            {selection.elevationM != null ? `${selection.elevationM.toFixed(2)} m` : 'not found on this terrain'}.
          </p>
        ) : (
          <p className="spn-card-subtitle">Click the terrain to inspect its elevation at that point.</p>
        )}
      </div>
    </div>
  )
}
