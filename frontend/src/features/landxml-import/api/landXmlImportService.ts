const API_BASE = 'http://localhost:8080'

export type CoordinateOrder = 'FIRST_X_SECOND_Y' | 'FIRST_Y_SECOND_X'
export interface SurfacePreview {
  name: string; points: number; faces: number; outerBoundaries: number; voidBoundaries: number; breaklines: number
  sourceBounds: number[] | null
  sourcePoints: { id: string; coordinate1: number; coordinate2: number; elevation: number }[]
}
export interface LandXmlInspectResult {
  application: string | null
  formatVersion: string | null
  surfaces: SurfacePreview[]
  unitsLabel: string | null
  crsStatus: 'RESOLVED' | 'REVIEW_REQUIRED'
  crsLabel: string | null
  surfaceNames: string[]
  alignmentNames: string[]
  profileNames: string[]
  warnings: string[]
}

/**
 * LANDXML-P01 (docs/roadmap.md): parses the file and reports what it
 * contains - no persistence yet. A LandXML file can hold several
 * surfaces/alignments, so the engineer picks which to import next
 * (`importLandXml`), never auto-imported.
 */
export async function inspectLandXml(file: File): Promise<LandXmlInspectResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/landxml/inspect`, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error(await errorMessage(res))
  }
  return res.json() as Promise<LandXmlInspectResult>
}

export interface LandXmlImportSummary {
  status: 'VALID' | 'REVIEW_REQUIRED'
  source: { application: string | null; formatVersion: string; units: string; surfaceName: string; coordinateOrder: CoordinateOrder;
    sourcePointCount: number; sourceFaceCount: number; invalidPoints: number; duplicatePointIds: number;
    invalidFaces: number; missingPointReferences: number; degenerateFaces: number }
  boundsMin: { x: number; y: number; z: number }
  boundsMax: { x: number; y: number; z: number }
  outerBoundaries: number; voidBoundaries: number; breaklines: number
  id: string
  terrainId: string
  pointCount: number
  triangleCount: number
  hasAlignment: boolean
  alignmentLengthM: number
  hasProfile: boolean
  warnings: string[]
}

export async function importLandXml(params: {
  file: File
  projectId: string
  coordinateSystemLabel: string
  surfaceName: string
  coordinateOrder: CoordinateOrder
  alignmentName: string | null
}): Promise<LandXmlImportSummary> {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('projectId', params.projectId)
  formData.append('coordinateSystemLabel', params.coordinateSystemLabel)
  formData.append('surfaceName', params.surfaceName)
  formData.append('coordinateOrder', params.coordinateOrder)
  if (params.alignmentName) {
    formData.append('alignmentName', params.alignmentName)
  }
  const res = await fetch(`${API_BASE}/api/landxml/import`, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error(await errorMessage(res))
  }
  return res.json() as Promise<LandXmlImportSummary>
}

export interface LongitudinalProfilePoint {
  chainageM: number
  groundElevationM: number | null
  designElevationM: number | null
}

export async function fetchLongitudinalProfile(importId: string, stepM = 0): Promise<LongitudinalProfilePoint[]> {
  const res = await fetch(`${API_BASE}/api/landxml/${importId}/profile?stepM=${stepM}`)
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/landxml/${importId}/profile`)
  }
  return res.json() as Promise<LongitudinalProfilePoint[]>
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null
  return body?.message ?? `Import failed: HTTP ${response.status}`
}
