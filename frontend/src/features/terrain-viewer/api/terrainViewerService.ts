import { decodeTerrainMesh } from '../lib/terrainBinary'
import { postJson, requestBinary, requestJson } from '../../../shared/api/http'

export interface TerrainMeshData {
  id: string
  positions: Float32Array
  indices: Uint32Array
  localOrigin: { x: number; y: number; z: number }
}

export async function fetchTerrainMesh(terrainId: string): Promise<TerrainMeshData> {
  return decodeTerrainMesh(await requestBinary(`/api/terrain/${terrainId}/mesh.bin`), terrainId)
}

export async function fetchTerrainElevation(terrainId: string, x: number, y: number): Promise<number | null> {
  const data = await requestJson<{ elevationM: number | null }>(`/api/terrain/${terrainId}/elevation?x=${x}&y=${y}`)
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
  return postJson<AlignmentSamplePoint[]>('/api/alignment/sample', params)
}

/** LANDXML-P01: samples a real, committed LandXML alignment (which may include circular arcs) instead of a manually-typed straight line. */
export async function fetchImportedAlignmentSample(importId: string, stepM = 0): Promise<AlignmentSamplePoint[]> {
  return requestJson<AlignmentSamplePoint[]>(`/api/alignment/${importId}/sample?stepM=${stepM}`)
}

export interface TerrainDiagnosticLine { name: string; type: string; edgeTrim: boolean; positions: number[] }
export function fetchTerrainDiagnostics(terrainId: string, breaklines: boolean): Promise<TerrainDiagnosticLine[]> {
  return requestJson<TerrainDiagnosticLine[]>(`/api/terrain/${terrainId}/diagnostics?breaklines=${breaklines}`)
}
