import { useState } from 'react'
import { useTerrainMesh } from '../hooks/useTerrainMesh'
import TerrainMesh, { type TerrainSelection } from './TerrainMesh'
import TerrainCanvasFrame from './TerrainCanvasFrame'

/**
 * A self-contained, embeddable 3D terrain preview - just the mesh,
 * orbit/zoom/fit-to-terrain, and click-to-inspect elevation. No
 * alignment overlay or its input fields (those stay in the full
 * `TerrainViewerPanel` under "3D & Visualization"). Used directly on
 * the Import Terrain screen (2026-09-14, engineer's own instruction -
 * "terran menüsü altında 3d view alanında tüm haritayı göstersin") so
 * the whole imported map is visible immediately, with no navigation
 * away from the import screen required.
 */
export default function TerrainPreview({ terrainId }: { terrainId: string }) {
  const meshQuery = useTerrainMesh(terrainId)
  const [selection, setSelection] = useState<TerrainSelection | null>(null)

  if (meshQuery.isPending) {
    return <p className="spn-card-subtitle">Loading 3D preview...</p>
  }

  if (meshQuery.isError || !meshQuery.data) {
    return (
      <p className="spn-error">
        {meshQuery.error instanceof Error ? meshQuery.error.message : 'Could not load the 3D preview.'}
      </p>
    )
  }

  return (
    <>
      <div className="spn-card" style={{ padding: 0, overflow: 'hidden' }}>
        <TerrainCanvasFrame height={380} mesh={meshQuery.data}>
          <TerrainMesh mesh={meshQuery.data} onSelect={setSelection} />
        </TerrainCanvasFrame>
      </div>
      <p className="spn-card-subtitle" style={{ marginTop: 8 }}>
        {selection
          ? `Selected: X ${selection.xM.toFixed(2)} m, Y ${selection.yM.toFixed(2)} m - elevation ${
              selection.elevationM != null ? `${selection.elevationM.toFixed(2)} m` : 'not found'
            }.`
          : 'Click the terrain to inspect elevation - drag to orbit, scroll to zoom.'}
      </p>
    </>
  )
}
