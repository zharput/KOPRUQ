import { useEffect, useState } from 'react'
import { Line } from '@react-three/drei'
import type { AlignmentSamplePoint, TerrainMeshData } from '../api/terrainViewerService'
import { fetchTerrainElevation } from '../api/terrainViewerService'
import { toThreeVector } from '../lib/coordinateTransform'

/**
 * Drapes a sampled alignment polyline onto the terrain surface -
 * visualization only, computed via live elevation queries against the
 * same terrain, not from `Alignment.toXYZ`'s caller-supplied elevation
 * (no vertical alignment model exists - see `AlignmentSamplePoint`'s
 * backend javadoc, backend/api/.../alignment). A sample point outside
 * the terrain's triangulated surface falls back to the local origin's
 * own elevation - an honest "nothing to drape onto here" default, not
 * an invented value.
 */
export default function AlignmentOverlay({
  terrainId,
  samples,
  localOrigin,
}: {
  terrainId: string
  samples: AlignmentSamplePoint[]
  localOrigin: TerrainMeshData['localOrigin']
}) {
  const [points, setPoints] = useState<[number, number, number][] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const resolved = await Promise.all(
        samples.map(async (s) => {
          const elevationM = await fetchTerrainElevation(terrainId, s.xM, s.yM)
          const z = elevationM ?? localOrigin.z
          return toThreeVector({ x: s.xM - localOrigin.x, y: s.yM - localOrigin.y, z: z - localOrigin.z })
        }),
      )
      if (!cancelled) setPoints(resolved)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [terrainId, samples, localOrigin])

  if (!points || points.length < 2) return null
  return <Line points={points} color="#ff5a36" lineWidth={3} />
}
