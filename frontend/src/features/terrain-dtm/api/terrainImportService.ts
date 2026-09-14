const API_BASE = 'http://localhost:8080'

export interface TerrainPreviewPoint {
  x: number
  y: number
  z: number
}

export interface TerrainImportResult {
  id: string
  pointCount: number
  triangleCount: number
  minXM: number
  maxXM: number
  minYM: number
  maxYM: number
  minElevationM: number
  maxElevationM: number
  previewPoints: TerrainPreviewPoint[]
}

/**
 * TERRAIN-P01 (docs/roadmap.md): the real backend import call, replacing
 * this screen's earlier client-only parse. A real multipart upload, not
 * JSON with the file's text embedded in a string field - an earlier
 * version did that and broke on a real ~20MB DTM file (Jackson's
 * default max JSON string length is 20,000,000 characters, and the
 * connection was dropped rather than returning a clean error). The raw
 * `File` is handed straight to `FormData` - never read into a JS string
 * client-side either, so large files aren't held in memory twice.
 */
export async function importTerrain(params: {
  file: File
  projectId: string
  coordinateSystemLabel: string
}): Promise<TerrainImportResult> {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('projectId', params.projectId)
  formData.append('coordinateSystemLabel', params.coordinateSystemLabel)

  const res = await fetch(`${API_BASE}/api/terrain/import`, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/terrain/import`)
  }
  return res.json() as Promise<TerrainImportResult>
}

export { API_BASE }
