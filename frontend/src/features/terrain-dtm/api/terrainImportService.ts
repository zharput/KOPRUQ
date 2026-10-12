import { postForm } from '../../../shared/api/http'

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
  status: 'IMPORTED' | 'VALID' | 'REVIEW_REQUIRED'
  warnings: string[]
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

  return postForm<TerrainImportResult>('/api/terrain/import', formData)
}
