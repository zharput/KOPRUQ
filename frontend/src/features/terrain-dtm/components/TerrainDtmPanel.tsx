import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { importTerrain } from '../api/terrainImportService'
import { TerrainPreview } from '../../terrain-viewer'
import LandXmlImportPanel from '../../landxml-import/components/LandXmlImportPanel'

/**
 * Site & Corridor > 3D Terrain / DTM (2026-09-14, engineer's own
 * instruction - "import terrain butonunu aktif yap. Harita datasını DTM
 * olarak import edeceğim"): the previous disabled placeholder button
 * (`shared/ui/ImportActionScreen`) was first replaced with a client-
 * only preview, then (TERRAIN-P01, same day - "DTM -> Java TerrainModel
 * -> elevation query -> React Three Fiber mesh -> alignment overlay")
 * upgraded to a real backend round trip: the uploaded file is parsed
 * and triangulated server-side into a queryable `TerrainModel`
 * (`backend/terrain`), not just previewed client-side. The upload is a
 * real multipart `FormData` (see `api/terrainImportService.ts`'s
 * javadoc) - an earlier JSON-body version broke on a real ~20MB DTM
 * file. `accept` includes `.dtm` alongside `.xyz`/`.csv`/`.txt`/`.asc`/
 * `.dem` - many "DTM" exports are plain X/Y/Z text despite the
 * extension, so it's worth letting the file picker show them rather
 * than filtering them out by default.
 *
 * <p>**Coordinate system is an honest label, not a silent assumption**
 * (spec section 22 - "if coordinate system cannot be reliably
 * determined, ASK THE USER"): a free-text field defaulting to "Local /
 * Unknown", attached to the import as metadata. No reprojection math
 * happens anywhere in TERRAIN-P01 - the points are used exactly as
 * given.
 *
 * <p>**The 3D view is embedded right here too** (2026-09-14, engineer's
 * own instruction - "terran menüsü altında 3d view alanında tüm
 * haritayı göstersin"): `features/terrain-viewer`'s `TerrainPreview` -
 * the whole imported map, orbit/zoom/click-to-inspect - renders
 * directly on this screen once import succeeds, no navigation away
 * needed. A "View in 3D" link still opens the full "3D & Visualization"
 * screen (`TerrainViewerPanel`) for the alignment-overlay work that
 * doesn't belong on an import screen. `terrainId` is lifted to
 * `App.tsx` (`onImported`) - the same pattern already used for
 * `crossSectionValues` - so the full viewer can find this terrain too.
 */
export default function TerrainDtmPanel({ onImported, projectId = 'default', coordinateSystemLabel: initialCoordinateSystemLabel = 'Local / Unknown' }: { onImported: (terrainId: string) => void; projectId?: string; coordinateSystemLabel?: string }) {
  const [landXmlFile, setLandXmlFile] = useState<File | null>(null)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const [coordinateSystemLabel, setCoordinateSystemLabel] = useState(initialCoordinateSystemLabel)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({ mutationFn: importTerrain })

  async function handleFile(file: File) {
    const header = await file.slice(0, 4096).text()
    if (/\.(xml|landxml)$/i.test(file.name) || /<(?:[\w-]+:)?LandXML\b/.test(header)) {
      setLandXmlFile(file); return
    }
    importMutation.reset()
    setSourceFileName(file.name)
    importMutation.mutate(
      { file, projectId, coordinateSystemLabel },
      { onSuccess: (result) => onImported(result.id) },
    )
  }

  const result = importMutation.data

  if (landXmlFile) return <LandXmlImportPanel initialFile={landXmlFile} title="3D Terrain / DTM" onImported={(value) => onImported(value.terrainId)} />

  return (
    <div className="spn-home">
      <h1>3D Terrain / DTM</h1>
      <p className="spn-home-intro">
        Select Bentley LandXML (.xml/.landxml) to preserve its source TIN, or an XYZ point file. LandXML opens a source preview before importing.
      </p>

      <div className="spn-card">
        <div className="spn-card-header-row">
          <h2 className="spn-card-title">Import Terrain</h2>
          <button type="button" className="spn-button-secondary" disabled={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
            {importMutation.isPending ? 'Importing...' : 'Import Terrain'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.landxml,.xyz,.csv,.txt,.dtm,.asc,.dem"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
        </div>

        <label className="spn-field" style={{ maxWidth: 260, marginTop: 12 }}>
          <span>Coordinate system (label only - not reprojected)</span>
          <input
            className="spn-input"
            value={coordinateSystemLabel}
            onChange={(e) => setCoordinateSystemLabel(e.target.value)}
          />
        </label>

        {importMutation.isError && (
          <p className="spn-error">
            {importMutation.error instanceof Error ? importMutation.error.message : 'Could not import that file.'}
          </p>
        )}

        {!sourceFileName && <p className="spn-home-empty">(no terrain data imported yet - use "Import Terrain" above)</p>}

        {result && (
          <>
            <p className="spn-card-subtitle">
              {sourceFileName} - {result.pointCount.toLocaleString()} point(s), {result.triangleCount.toLocaleString()}{' '}
              triangle(s). Bounds: X [{result.minXM.toFixed(2)}, {result.maxXM.toFixed(2)}], Y [
              {result.minYM.toFixed(2)}, {result.maxYM.toFixed(2)}], Z [{result.minElevationM.toFixed(2)},{' '}
              {result.maxElevationM.toFixed(2)}].
            </p>
            <table className="spn-table">
              <thead>
                <tr>
                  <th>X</th>
                  <th>Y</th>
                  <th>Z</th>
                </tr>
              </thead>
              <tbody>
                {result.previewPoints.map((p, i) => (
                  <tr key={i}>
                    <td>{p.x}</td>
                    <td>{p.y}</td>
                    <td>{p.z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.pointCount > result.previewPoints.length && (
              <p className="spn-card-subtitle">...and {result.pointCount - result.previewPoints.length} more point(s).</p>
            )}
          </>
        )}
      </div>

      {result && (
        <div className="spn-card" style={{ marginTop: 16 }}>
          <div className="spn-card-header-row">
            <h2 className="spn-card-title">3D View</h2>
            <Link to="/3d-visualization" className="spn-button-secondary">
              Open full viewer (alignment overlay)
            </Link>
          </div>
          <TerrainPreview terrainId={result.id} />
        </div>
      )}
    </div>
  )
}
