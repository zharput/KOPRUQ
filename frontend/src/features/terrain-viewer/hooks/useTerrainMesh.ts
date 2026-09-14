import { useQuery } from '@tanstack/react-query'
import { fetchTerrainMesh } from '../api/terrainViewerService'

export function useTerrainMesh(terrainId: string | null) {
  return useQuery({
    queryKey: ['terrain-mesh', terrainId],
    queryFn: () => fetchTerrainMesh(terrainId as string),
    staleTime: Infinity,
    structuralSharing: false,
    enabled: terrainId != null,
  })
}
