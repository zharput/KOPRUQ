import { decodeTerrainMesh } from '../lib/terrainBinary'
const API_BASE = 'http://localhost:8080'

export interface TerrainMeshData {
  id: string
  positions: Float32Array
  indices: Uint32Array
  localOrigin: { x: number; y: number; z: number }
}

export async function fetchTerrainMesh(terrainId: string): Promise<TerrainMeshData> {
  const res = await fetch(`${API_BASE}/api/terrain/${terrainId}/mesh.bin`)
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/terrain/${terrainId}/mesh.bin`)
  }
  return decodeTerrainMesh(await res.arrayBuffer(), terrainId)
}

export async function fetchTerrainElevation(terrainId: string, x: number, y: number): Promise<number | null> {
  const res = await fetch(`${API_BASE}/api/terrain/${terrainId}/elevation?x=${x}&y=${y}`)
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/terrain/${terrainId}/elevation`)
  }
  const data = (await res.json()) as { elevationM: number | null }
  return data.elevationM
}

export interface AlignmentSamplePoint {
  xM: number
  yM: number
  chainageM: number
}

export async function sampleAlignment(params: {
  startXM: number
  startYM: number
  endXM: number
  endYM: number
  stepM: number
}): Promise<AlignmentSamplePoint[]> {
  const res = await fetch(`${API_BASE}/api/alignment/sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/alignment/sample`)
  }
  return res.json() as Promise<AlignmentSamplePoint[]>
}

/** LANDXML-P01: samples a real, committed LandXML alignment (which may include circular arcs) instead of a manually-typed straight line. */
export async function fetchImportedAlignmentSample(importId: string, stepM = 0): Promise<AlignmentSamplePoint[]> {
  const res = await fetch(`${API_BASE}/api/alignment/${importId}/sample?stepM=${stepM}`)
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/alignment/${importId}/sample`)
  }
  return res.json() as Promise<AlignmentSamplePoint[]>
}
