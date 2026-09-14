import type { TerrainMeshData } from '../api/terrainViewerService'

/** Versioned little-endian terrain transport. Axis conversion remains in coordinateTransform. */
export function decodeTerrainMesh(buffer: ArrayBuffer, id: string): TerrainMeshData {
  if (buffer.byteLength < 40) throw new Error('Truncated terrain header')
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x53504e54 || view.getUint32(4, true) !== 1) {
    throw new Error('Unsupported terrain payload')
  }
  const vertices = view.getUint32(8, true)
  const triangles = view.getUint32(12, true)
  if (buffer.byteLength !== 40 + vertices * 12 + triangles * 12) throw new Error('Terrain payload length mismatch')
  const positions = new Float32Array(vertices * 3)
  const indices = new Uint32Array(triangles * 3)
  for (let i = 0; i < positions.length; i++) {
    positions[i] = view.getFloat32(40 + i * 4, true)
    if (!Number.isFinite(positions[i])) throw new Error('Non-finite terrain position')
  }
  const indexOffset = 40 + vertices * 12
  for (let i = 0; i < indices.length; i++) {
    indices[i] = view.getUint32(indexOffset + i * 4, true)
    if (indices[i] >= vertices) throw new Error('Terrain index outside vertex buffer')
  }
  return { id, positions, indices, localOrigin: {
    x: view.getFloat64(16, true), y: view.getFloat64(24, true), z: view.getFloat64(32, true),
  } }
}
