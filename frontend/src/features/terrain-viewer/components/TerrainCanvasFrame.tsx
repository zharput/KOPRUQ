import { useCallback, useLayoutEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { TerrainMeshData } from '../api/terrainViewerService'
import { toThreeVector } from '../lib/coordinateTransform'

/** Fit from the local terrain center: a survey origin must never determine the viewing direction. */
export default function TerrainCanvasFrame({ height, children, mesh }: {
  height: number; children: ReactNode; mesh: TerrainMeshData
}) {
  const bounds=useMemo(() => {
    const box=new THREE.Box3()
    const point=new THREE.Vector3()
    for(let i=0;i<mesh.positions.length;i+=3) {
      point.set(...toThreeVector({x:mesh.positions[i],y:mesh.positions[i+1],z:mesh.positions[i+2]}))
      box.expandByPoint(point)
    }
    return box
  },[mesh])
  return <div style={{ position:'relative',width:'100%',height }}>
    <Canvas frameloop="demand" camera={{ position:[50,80,120],fov:45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[100,150,80]} intensity={0.8} />
      {children}
      <OrbitControls makeDefault />
      <TerrainCamera bounds={bounds} />
    </Canvas>
  </div>
}

function TerrainCamera({ bounds }: { bounds: THREE.Box3 }) {
  const {camera,controls,invalidate,size}=useThree()
  const fit=useCallback(() => {
    if(!(camera instanceof THREE.PerspectiveCamera) || bounds.isEmpty()) return
    const center=bounds.getCenter(new THREE.Vector3())
    const radius=Math.max(bounds.getSize(new THREE.Vector3()).length()/2,1)
    const vertical=THREE.MathUtils.degToRad(camera.fov/2)
    const horizontal=Math.atan(Math.tan(vertical)*size.width/Math.max(size.height,1))
    const distance=radius/Math.sin(Math.min(vertical,horizontal))*1.15
    camera.position.copy(center).addScaledVector(new THREE.Vector3(1,1,1).normalize(),distance)
    camera.near=Math.max(radius/10000,0.01);camera.far=distance+radius*10
    camera.lookAt(center);camera.updateProjectionMatrix()
    const orbit=controls as unknown as {target:THREE.Vector3;update:()=>void} | null
    if(orbit) {orbit.target.copy(center);orbit.update()}
    invalidate()
  },[bounds,camera,controls,invalidate,size.width,size.height])
  useLayoutEffect(fit,[fit])
  return <Html fullscreen style={{pointerEvents:'none'}}>
    <button type="button" className="spn-button-secondary" style={{position:'absolute',top:12,right:12,pointerEvents:'auto'}} onClick={fit}>
      Fit to Terrain
    </button>
  </Html>
}
