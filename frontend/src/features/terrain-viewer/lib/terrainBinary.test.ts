import { describe, it, expect } from 'vitest'
import { decodeTerrainMesh } from './terrainBinary'
import { fromThreeVector, toThreeVector } from './coordinateTransform'
function payload(vertices = 70000) {
  const bytes=new ArrayBuffer(40+vertices*12+12), view=new DataView(bytes)
  view.setUint32(0,0x53504e54,true);view.setUint32(4,1,true);view.setUint32(8,vertices,true);view.setUint32(12,1,true)
  view.setFloat64(16,442156.460,true);view.setFloat64(24,460725.719,true);view.setFloat64(32,402.963013,true)
  view.setUint32(40+vertices*12+4,65536,true);view.setUint32(40+vertices*12+8,69999,true)
  return bytes
}
describe('terrain binary transport',() => {
  it('retains Uint32 indices beyond 65535 and a double origin',() => {
    const mesh=decodeTerrainMesh(payload(),'id')
    expect(mesh.positions).toBeInstanceOf(Float32Array);expect(mesh.indices).toBeInstanceOf(Uint32Array)
    expect([...mesh.indices]).toEqual([0,65536,69999]);expect(mesh.localOrigin.z).toBe(402.963013)
  })
  it('rejects truncated and invalid index payloads',() => {
    expect(() => decodeTerrainMesh(new ArrayBuffer(10),'id')).toThrow('Truncated')
    const bytes=payload();new DataView(bytes).setUint32(40+70000*12,70000,true)
    expect(() => decodeTerrainMesh(bytes,'id')).toThrow('outside')
    expect(() => decodeTerrainMesh(payload().slice(0,-4),'id')).toThrow('length')
  })
  it('reverses the established Z-up/Y-up transform without mirroring axes',() => {
    const p={x:12.125,y:-48.25,z:7.75}, [x,y,z]=toThreeVector(p)
    expect([x,y,z]).toEqual([12.125,7.75,48.25]);expect(fromThreeVector({x,y,z})).toEqual(p)
  })
})
