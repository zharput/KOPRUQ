import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useQuery } from '@tanstack/react-query'
import type { ThreeEvent } from '@react-three/fiber'
import type { TerrainMeshData } from '../api/terrainViewerService'
import { fetchTerrainElevation } from '../api/terrainViewerService'
import { fromThreeVector, toThreeVector } from '../lib/coordinateTransform'

export interface TerrainSelection { xM: number; yM: number; elevationM: number | null }
interface DiagnosticLine { name: string; type: string; edgeTrim: boolean; positions: number[] }

/** One indexed terrain mesh; optional batched diagnostics, never one object per point/face. */
export default function TerrainMesh({ mesh, onSelect }: { mesh: TerrainMeshData; onSelect: (value: TerrainSelection) => void }) {
  const [layers, setLayers] = useState({ surface: true, wireframe: false, vertices: false, outer: false, voids: false, breaklines: false })
  const [error, setError] = useState<string | null>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(mesh.positions.length)
    for (let i=0;i<positions.length;i+=3) {
      positions.set(toThreeVector({ x:mesh.positions[i], y:mesh.positions[i+1], z:mesh.positions[i+2] }),i)
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position',new THREE.BufferAttribute(positions,3))
    geom.setIndex(new THREE.BufferAttribute(mesh.indices,1))
    geom.computeVertexNormals(); geom.computeBoundingBox(); geom.computeBoundingSphere()
    return geom
  },[mesh])
  useEffect(() => () => geometry.dispose(),[geometry])

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    const p=fromThreeVector(event.point)
    const xM=p.x+mesh.localOrigin.x, yM=p.y+mesh.localOrigin.y
    void fetchTerrainElevation(mesh.id,xM,yM).then((elevationM) => {
      setError(null); onSelect({ xM,yM,elevationM })
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Elevation query failed'))
  }
  return <>
    <mesh geometry={geometry} visible={layers.surface} onClick={handleClick}>
      <meshStandardMaterial color="#5b8def" side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
    {layers.wireframe && <mesh geometry={geometry}><meshBasicMaterial color="#a8caff" wireframe /></mesh>}
    {layers.vertices && <VertexCloud geometry={geometry} />}
    {(layers.outer || layers.voids) && <DiagnosticLines terrainId={mesh.id} outer={layers.outer} voids={layers.voids} />}
    {layers.breaklines && <DiagnosticLines terrainId={mesh.id} breaklines />}
    <Html fullscreen style={{ pointerEvents:'none' }}><div style={{ position:'absolute', bottom:8, left:8, right:8, pointerEvents:'auto', background:'rgba(15,23,42,0.88)', color:'white', padding:8 }}>
      {(['surface','wireframe','vertices','outer','voids','breaklines'] as const).map((key) => <label key={key} style={{ marginRight:12 }}>
        <input type="checkbox" checked={layers[key]} onChange={(event) => setLayers((prev) => ({ ...prev,[key]:event.target.checked }))} /> {key}
      </label>)}
      {error && <div role="alert">{error}</div>}
    </div></Html>
  </>
}

function DiagnosticLines({ terrainId, outer=false, voids=false, breaklines=false }: {
  terrainId:string; outer?:boolean; voids?:boolean; breaklines?:boolean
}) {
  const query=useQuery({ queryKey:['terrain-diagnostics',terrainId,breaklines], queryFn: async () => {
    const response=await fetch(`http://localhost:8080/api/terrain/${terrainId}/diagnostics?breaklines=${breaklines}`)
    if (!response.ok) throw new Error(`Diagnostics HTTP ${response.status}`)
    return response.json() as Promise<DiagnosticLine[]>
  }, staleTime:Infinity })
  const geometry=useMemo(() => {
    const lines=(query.data ?? []).filter((line) => breaklines || (outer && line.type==='OUTER') || (voids && line.type==='VOID'))
    const count=lines.reduce((sum,line) => sum+Math.max(0,line.positions.length/3-1)*2,0)
    const positions=new Float32Array(count*3), colors=new Float32Array(count*3)
    let cursor=0
    for (const line of lines) {
      const color=new THREE.Color(line.type==='VOID' ? '#ff4365' : line.type==='OUTER' ? '#45ff90' : '#ffc857')
      for (let i=3;i<line.positions.length;i+=3) {
        for (const j of [i-3,i]) {
          positions.set(toThreeVector({ x:line.positions[j],y:line.positions[j+1],z:line.positions[j+2] }),cursor)
          colors.set([color.r,color.g,color.b],cursor);cursor+=3
        }
      }
    }
    const geom=new THREE.BufferGeometry()
    geom.setAttribute('position',new THREE.BufferAttribute(positions,3))
    geom.setAttribute('color',new THREE.BufferAttribute(colors,3))
    return geom
  },[query.data,outer,voids,breaklines])
  useEffect(() => () => geometry.dispose(),[geometry])
  if (query.isError) return <Html><span className="spn-error">{query.error.message}</span></Html>
  if (query.isPending) return <Html>Loading diagnostics...</Html>
  return <lineSegments geometry={geometry}><lineBasicMaterial vertexColors depthTest={false} /></lineSegments>
}

function VertexCloud({ geometry }: { geometry: THREE.BufferGeometry }) {
  const pointsGeometry=useMemo(() => {
    const result=new THREE.BufferGeometry()
    result.setAttribute('position',geometry.getAttribute('position'))
    return result
  },[geometry])
  useEffect(() => () => pointsGeometry.dispose(),[pointsGeometry])
  return <points geometry={pointsGeometry}><pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} /></points>
}
