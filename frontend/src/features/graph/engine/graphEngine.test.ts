import { describe, expect, it } from 'vitest'
import type { GraphParameterValue, SpanovaConnection, SpanovaGraph, SpanovaNode } from '../domain/types'
import { executeGraph, portCanConnect, validateConnection, validateGraph } from './graphEngine'
import { deserializeGraph, serializeGraph } from '../state/graphStore'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { canConnect } from '../registry/nodeRegistry'

function node(id: string, type: string, value?: number) : SpanovaNode {
  const parameters: Record<string, GraphParameterValue> = type === 'input.number' || type === 'input.integer' ? { value: value ?? 0 } : type === 'input.range' ? { min: 30, max: 50, step: 5 } : {}
  const label = type.split('.').at(-1) ?? type
  return { id, type, name: `${label}-${id}`, position: { x: 20, y: 40 }, parameters }
}
function graph(nodes: SpanovaNode[], connections: SpanovaConnection[] = []): SpanovaGraph { return { id: 'G-1', name: 'Test Graph', schemaVersion: 1, nodes, connections } }
function edge(id: string, source: string, sourcePort: string, target: string, targetPort: string): SpanovaConnection { return { id, sourceNodeId: source, sourcePortId: sourcePort, targetNodeId: target, targetPortId: targetPort } }

describe('SPANOVA Graph engine', () => {
  it('executes Number 30 × Number 2 into Watch = 60', async () => {
    const result = await executeGraph(graph([node('n1', 'input.number', 30), node('n2', 'input.number', 2), node('mul', 'math.multiply'), node('watch', 'output.watch')], [edge('e1', 'n1', 'value', 'mul', 'a'), edge('e2', 'n2', 'value', 'mul', 'b'), edge('e3', 'mul', 'result', 'watch', 'value')]))
    expect(result.errors).toEqual({})
    expect(result.watchValues.watch).toBe(60)
    expect(result.logs.at(-1)?.message).toContain('completed')
  })

  it('executes an inclusive Range 30, 35, 40, 45, 50 through Watch', async () => {
    const result = await executeGraph(graph([node('range', 'input.range'), node('watch', 'output.watch')], [edge('e1', 'range', 'values', 'watch', 'value')]))
    expect(result.watchValues.watch).toEqual([30, 35, 40, 45, 50])
  })

  it('generates ranges from connected Math scalar inputs and overrides local defaults', async () => {
    const start=node('start','input.number',2), base=node('base','input.number',3), offset=node('offset','input.number',1), step=node('step','input.number',1), add=node('add','math.add'), range=node('range','input.range')
    range.parameters={min:90,max:0,step:99,quantityKind:'dimensionless',unit:'1'}
    const result=await executeGraph(graph([start,base,offset,step,add,range,node('watch','output.watch')],[edge('a','base','value','add','a'),edge('b','offset','value','add','b'),edge('end','add','result','range','end'),edge('start','start','value','range','start'),edge('step','step','value','range','increment'),edge('watch','range','values','watch','value')]))
    expect(result.errors).toEqual({});expect(result.watchValues.watch).toEqual([2,3,4])
  })

  it('supports Math singleton broadcasting with numeric lists', async () => {
    const range=node('range','input.range');range.parameters={min:2,max:4,step:1,quantityKind:'dimensionless',unit:'1'}
    const scalar=node('scalar','input.number',10),add=node('add','math.add'),watch=node('watch','output.watch')
    const result=await executeGraph(graph([range,scalar,add,watch],[edge('list','range','values','add','a'),edge('scalar','scalar','value','add','b'),edge('watch','add','result','watch','value')]))
    expect(result.errors).toEqual({});expect(result.watchValues.watch).toEqual([12,13,14])
  })

  it('broadcasts singleton lists and rejects incompatible list lengths', async () => {
    const a=node('a','input.range');a.parameters={min:1,max:3,step:1,quantityKind:'dimensionless',unit:'1'}
    const b=node('b','input.range');b.parameters={min:10,max:10,step:1,quantityKind:'dimensionless',unit:'1'}
    const add=node('add','math.add'),watch=node('watch','output.watch')
    const result=await executeGraph(graph([a,b,add,watch],[edge('a','a','values','add','a'),edge('b','b','values','add','b'),edge('watch','add','result','watch','value')]))
    expect(result.errors).toEqual({});expect(result.watchValues.watch).toEqual([11,12,13])
    b.parameters.max=11
    const mismatch=await executeGraph(graph([a,b,add],[edge('a','a','values','add','a'),edge('b','b','values','add','b')]))
    expect(mismatch.errors.add).toContain('List lengths do not match (3 and 2).')
  })

  it('rejects Range direction, nonpositive step, nonfinite values and oversized lists', async () => {
    const range=node('r','input.range')
    for(const parameters of [{min:4,max:2,step:1},{min:0,max:2,step:0},{min:0,max:2,step:Number.NaN},{min:0,max:10000,step:1}]){
      range.parameters=parameters
      const result=await executeGraph(graph([range]))
      expect(Object.keys(result.errors)).toContain('r')
    }
  })

  it('applies endpoint tolerance to a floating-point Range', async () => {
    const range=node('r','input.range');range.parameters={min:0,max:.3,step:.1,quantityKind:'dimensionless',unit:'1'}
    const result=await executeGraph(graph([range,node('watch','output.watch')],[edge('e','r','values','watch','value')]))
    expect(result.watchValues.watch).toEqual([0,.1,.2,.3])
  })

  it('supports descending ranges only with a negative step toward End', async () => {
    const range=node('r','input.range');range.parameters={min:3,max:2,step:-.5,quantityKind:'dimensionless',unit:'1'}
    const result=await executeGraph(graph([range,node('watch','output.watch')],[edge('e','r','values','watch','value')]))
    expect(result.errors).toEqual({});expect(result.watchValues.watch).toEqual([3,2.5,2])
    range.parameters.step=.5
    expect((await executeGraph(graph([range]))).errors.r).toContain('Step direction')
  })

  it('handles scalar/list division by zero without propagating nonfinite values', async () => {
    const values=node('values','input.range');values.parameters={min:1,max:2,step:1,quantityKind:'dimensionless',unit:'1'}
    const zero=node('zero','input.number',0),divide=node('divide','math.divide')
    const result=await executeGraph(graph([values,zero,divide],[edge('a','values','values','divide','a'),edge('b','zero','value','divide','b')]))
    expect(result.errors.divide).toBe('Division by zero.')
  })

  it('adds compatible equal-length lists element by element', async () => {
    const a=node('a','input.range');a.parameters={min:1,max:3,step:1,quantityKind:'dimensionless',unit:'1'}
    const b=node('b','input.range');b.parameters={min:10,max:30,step:10,quantityKind:'dimensionless',unit:'1'}
    const add=node('add','math.add'),watch=node('watch','output.watch')
    const result=await executeGraph(graph([a,b,add,watch],[edge('a','a','values','add','a'),edge('b','b','values','add','b'),edge('watch','add','result','watch','value')]))
    expect(result.watchValues.watch).toEqual([11,22,33])
  })

  it('keeps Pier Cartesian ordering and candidate identity when a Math list feeds geometry', async () => {
    const range=node('r','input.range');range.parameters={min:1,max:2,step:1,quantityKind:'dimensionless',unit:'1'}
    const increment=node('d','input.number',2),multiply=node('mul','math.multiply'),pier=node('p','substructure.pier.rectangular')
    pier.parameters=getNodeDefinition(pier.type)!.createDefaultParameters({length:'m'})
    const result=await executeGraph(graph([range,increment,multiply,pier],[edge('a','r','values','mul','a'),edge('b','d','value','mul','b'),edge('p','mul','result','p','width')]),undefined,{projectUnits:{length:'m'}})
    expect(result.errors).toEqual({});expect(result.values.p.candidates).toMatchObject([{geometry:{B:2}},{geometry:{B:4}}])
    const repeated=await executeGraph(graph([range,increment,multiply,pier],[edge('a','r','values','mul','a'),edge('b','d','value','mul','b'),edge('p','mul','result','p','width')]),undefined,{projectUnits:{length:'m'}})
    expect((result.values.p.candidates as import('../domain/types').PierCandidate[]).map(item=>item.id)).toEqual((repeated.values.p.candidates as import('../domain/types').PierCandidate[]).map(item=>item.id))
  })

  it('validates math list sources and keeps list-to-scalar Range connections invalid', () => {
    const range=node('r','input.range'),mathNode=node('m','math.add')
    expect(validateConnection(graph([range,mathNode]),{sourceNodeId:'r',sourcePortId:'values',targetNodeId:'m',targetPortId:'a'})).toBeUndefined()
    expect(validateConnection(graph([range,node('r2','input.range')]),{sourceNodeId:'r',sourcePortId:'values',targetNodeId:'r2',targetPortId:'end'})).toBeDefined()
  })

  it('accepts matching and integer-to-number ports but rejects unsafe conversions', () => {
    expect(portCanConnect('number', 'number')).toBe(true)
    expect(portCanConnect('integer', 'number')).toBe(true)
    expect(portCanConnect('number', 'integer')).toBe(false)
    expect(portCanConnect('boolean', 'number')).toBe(false)
    expect(portCanConnect('number[]', 'number[]')).toBe(true)
    expect(portCanConnect('number', 'display:any')).toBe(true)
    expect(portCanConnect('integer', 'display:any')).toBe(true)
    expect(portCanConnect('boolean', 'display:any')).toBe(true)
    expect(portCanConnect('number[]', 'display:any')).toBe(true)
    expect(portCanConnect('pierFamily', 'display:any')).toBe(false)
    const candidate = { sourceNodeId: 'bool', sourcePortId: 'value', targetNodeId: 'mul', targetPortId: 'a' }
    const invalidGraph = graph([node('bool', 'input.boolean'), node('mul', 'math.multiply')])
    expect(validateConnection(invalidGraph, candidate)?.message).toContain('Cannot connect boolean to number')
  })

  it('keeps interactive validation local and leaves cycle detection to full validation', () => {
    const cyclic = graph([node('a', 'math.add'), node('b', 'math.add')], [edge('ab', 'a', 'result', 'b', 'a')])
    const before = structuredClone(cyclic)
    expect(validateConnection(cyclic, { sourceNodeId: 'b', sourcePortId: 'result', targetNodeId: 'a', targetPortId: 'a' })).toBeUndefined()
    expect(cyclic).toEqual(before)
    expect(validateGraph({ ...cyclic, connections: [...cyclic.connections, edge('ba', 'b', 'result', 'a', 'a')] }).some((issue) => issue.message.includes('Cycle detected'))).toBe(true)
  })

  it('rejects an incompatible committed connection without changing the graph', () => {
    const graphBefore = graph([node('bool', 'input.boolean'), node('mul', 'math.multiply')])
    const before = structuredClone(graphBefore)
    const candidate = { sourceNodeId: 'bool', sourcePortId: 'value', targetNodeId: 'mul', targetPortId: 'a' }
    expect(validateConnection(graphBefore, candidate)?.message).toContain('Cannot connect boolean to number')
    expect(graphBefore).toEqual(before)
  })

  it('detects cycles and missing required inputs before execution', async () => {
    const cyclic = graph([node('a', 'math.add'), node('b', 'math.multiply')], [edge('ab', 'a', 'result', 'b', 'a'), edge('ba', 'b', 'result', 'a', 'a')])
    expect(validateGraph(cyclic).some((issue) => issue.message.includes('Cycle detected'))).toBe(true)
    expect((await executeGraph(cyclic)).logs.some((entry) => entry.message.includes('Cycle detected'))).toBe(true)
    expect((await executeGraph(graph([node('mul', 'math.multiply')]))).errors.mul).toContain('Input A is not connected')
  })

  it('rejects parameters outside the central node schema', () => {
    const malformed = node('number', 'input.number', 5)
    malformed.parameters.extra = 'unexpected'
    expect(validateGraph(graph([malformed])).map((issue) => issue.message)).toContain('Unknown parameter: extra.')
  })

  it('reports division by zero as a node error without throwing from the engine', async () => {
    const result = await executeGraph(graph([node('n1', 'input.number', 10), node('n2', 'input.number', 0), node('div', 'math.divide')], [edge('e1', 'n1', 'value', 'div', 'a'), edge('e2', 'n2', 'value', 'div', 'b')]))
    expect(result.errors.div).toBe('Division by zero.')
    expect(result.logs.at(-1)).toMatchObject({ level: 'ERROR' })
  })

  it('round-trips the SPANOVA serialization independently of React Flow nodes', () => {
    const original = graph([node('n1', 'input.number', 30), node('watch', 'output.watch')], [edge('e1', 'n1', 'value', 'watch', 'value')])
    expect(deserializeGraph(serializeGraph(original))).toEqual(original)
    expect(() => deserializeGraph('{"schemaVersion":2}')).toThrow('Unsupported or invalid')
  })

  it('round-trips Quantity node kind and display unit as ordinary graph parameters', () => {
    const quantity=node('q','input.quantity');quantity.parameters={value:2,quantityKind:'length',unit:'m'}
    const original=graph([quantity,node('watch','output.watch')],[edge('e','q','value','watch','value')])
    expect(deserializeGraph(serializeGraph(original))).toEqual(original)
  })

  it('executes mixed-unit quantities through Add and displays in the first input unit', async () => {
    const a = node('a','input.quantity'), b = node('b','input.quantity')
    a.parameters = { value:2, quantityKind:'length', unit:'m' }
    b.parameters = { value:500, quantityKind:'length', unit:'mm' }
    const result = await executeGraph(graph([a,b,node('add','math.add'),node('watch','output.watch')],[edge('e1','a','value','add','a'),edge('e2','b','value','add','b'),edge('e3','add','result','watch','value')]))
    expect(result.errors).toEqual({})
    expect(result.watchValues.watch).toMatchObject({ value:2.5, quantityKind:'length', unit:'m' })
  })

  it('preserves quantity metadata in a robust stepped Range', async () => {
    const range=node('r','input.range'); range.parameters={min:0,max:1,step:.1,quantityKind:'length',unit:'m'}
    const result=await executeGraph(graph([range,node('watch','output.watch')],[edge('e','r','values','watch','value')]))
    expect(result.errors).toEqual({})
    expect(result.watchValues.watch).toHaveLength(11)
    const values=result.watchValues.watch as {value:number;quantityKind:string;unit:string}[]
    expect(values[0]).toMatchObject({value:0,quantityKind:'length',unit:'m'})
    expect(values[3]).toMatchObject({value:.3,quantityKind:'length',unit:'m'})
  })

  it('rejects mixed dimensions during math execution and displays concrete identity', async () => {
    const a=node('a','input.quantity'), b=node('b','input.quantity')
    a.parameters={value:2,quantityKind:'length',unit:'m'};b.parameters={value:40,quantityKind:'stress',unit:'MPa'}
    expect(validateConnection(graph([a,b,node('add','math.add')],[edge('e1','a','value','add','a')]),{sourceNodeId:'b',sourcePortId:'value',targetNodeId:'add',targetPortId:'b'})?.message).toContain('same kind')
    const invalid=await executeGraph(graph([a,b,node('add','math.add')],[edge('e1','a','value','add','a'),edge('e2','b','value','add','b')]))
    expect(invalid.errors.add).toContain('same kind')
    const concrete=getNodeDefinition('material.concrete')!
    const material=(await concrete.executor({node:{...node('c','material.concrete'),parameters:{materialId:'C40/50'}},inputs:{}})).material
    expect(material).toMatchObject({domainType:'ConcreteMaterial',id:'C40/50',name:'C40/50'})
  })

  it('does not expose unconfigured steel grades as valid catalog entries', () => {
    const steel=getNodeDefinition('material.reinforcement')!
    const messages=steel.validateParameters({materialId:''})
    expect(messages[0]).toContain('catalog data are not configured')
  })

  it('executes a concrete material headlessly through an injected domain resolver', async () => {
    const concrete=node('c','material.concrete'); concrete.parameters={materialId:'C40/50'}
    const result=await executeGraph(graph([concrete,node('watch','output.watch')],[edge('e','c','material','watch','value')]),undefined,{resolveConcreteMaterial:async id=>({domainType:'ConcreteMaterial',id,name:id,properties:{fck:{value:40,quantityKind:'stress',unit:'MPa'}}})})
    expect(result.errors).toEqual({})
    expect(result.watchValues.watch).toMatchObject({domainType:'ConcreteMaterial',id:'C40/50',properties:{fck:{value:40,quantityKind:'stress',unit:'MPa'}}})
  })

  it('generates Circular Pier candidates from connected Length Range values and watches them', async () => {
    const range=node('r','input.range'); range.parameters={min:2,max:3,step:.25,quantityKind:'length',unit:'m'}
    const pier=node('p','substructure.pier.circular'); pier.parameters=getNodeDefinition(pier.type)!.createDefaultParameters()
    const result=await executeGraph(graph([range,pier,node('w','output.watch')],[edge('d','r','values','p','diameter'),edge('w1','p','candidates','w','value')]))
    expect(result.errors).toEqual({})
    expect(result.watchValues.w).toHaveLength(5)
    expect((result.watchValues.w as import('../domain/types').PierCandidate[]).map(item=>item.geometry.D)).toEqual([2,2.25,2.5,2.75,3])
  })

  it('uses local Pier defaults, with connected Quantity overriding the local diameter', async () => {
    const pier=node('p','substructure.pier.circular'); pier.parameters=getNodeDefinition(pier.type)!.createDefaultParameters()
    const local=await executeGraph(graph([pier]))
    expect((local.values.p.candidates as import('../domain/types').PierCandidate[])[0].geometry.D).toBe(2)
    const quantity=node('q','input.quantity'); quantity.parameters={value:250,quantityKind:'length',unit:'cm'}
    const connected=await executeGraph(graph([quantity,pier],[edge('e','q','value','p','diameter')]))
    expect((connected.values.p.candidates as import('../domain/types').PierCandidate[])[0].geometry.D).toBe(2.5)
  })

  it('accepts Integer and Concrete Pier inputs while rejecting Stress and steel material inputs', () => {
    const pier=node('p','substructure.pier.circular'); pier.parameters=getNodeDefinition(pier.type)!.createDefaultParameters()
    const integer=node('i','input.integer',2), stress=node('s','input.quantity'); stress.parameters={value:40,quantityKind:'stress',unit:'MPa'}
    const concrete=node('c','material.concrete'), steel=node('st','material.structuralSteel')
    const base=graph([pier,integer,stress,concrete,steel])
    expect(validateConnection(base,{sourceNodeId:'i',sourcePortId:'value',targetNodeId:'p',targetPortId:'columns'})).toBeUndefined()
    expect(validateConnection(base,{sourceNodeId:'c',sourcePortId:'material',targetNodeId:'p',targetPortId:'material'})).toBeUndefined()
    expect(validateConnection(base,{sourceNodeId:'s',sourcePortId:'value',targetNodeId:'p',targetPortId:'diameter'})).toBeDefined()
    expect(validateConnection(base,{sourceNodeId:'st',sourcePortId:'material',targetNodeId:'p',targetPortId:'material'})).toBeDefined()
  })

  it('allows target-aware numeric coercion without changing Number or Integer compatibility', () => {
    expect(portCanConnect('number', 'length[]')).toBe(true)
    expect(portCanConnect('numeric[]', 'length[]')).toBe(true)
    expect(canConnect('number', 'quantity', undefined, 'stress')).toBe(true)
    expect(canConnect('number', 'quantity', undefined, 'force')).toBe(true)
    expect(canConnect('quantity', 'length[]', 'stress', 'length')).toBe(false)
    expect(canConnect('quantity', 'length[]', 'force', 'length')).toBe(false)
    expect(portCanConnect('integer', 'integer')).toBe(true)
    expect(portCanConnect('number', 'integer')).toBe(false)
  })

  it('coerces Number inputs to project Length units only when executing engineering inputs', async () => {
    const b = node('b', 'input.number', 3), d = node('d', 'input.number', 4), h = node('h', 'input.number', 12)
    const pier = node('p', 'substructure.pier.rectangular'); pier.parameters = getNodeDefinition(pier.type)!.createDefaultParameters()
    const result = await executeGraph(graph([b, d, h, pier], [edge('b', 'b', 'value', 'p', 'width'), edge('d', 'd', 'value', 'p', 'depth'), edge('h', 'h', 'value', 'p', 'height')]), undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    expect(result.values.p.candidates).toMatchObject([{ geometry: { B: 3, D: 4 }, heightM: 12 }])
    expect(result.resolvedInputs.p.width).toMatchObject({ value: 3, quantityKind: 'length', unit: 'm' })
    expect(result.values.b.value).toBe(3)

    const millimetre = node('mm', 'input.number', 3000), circle = node('c', 'substructure.pier.circular'); circle.parameters = getNodeDefinition(circle.type)!.createDefaultParameters()
    const metric = await executeGraph(graph([millimetre, circle], [edge('mm', 'mm', 'value', 'c', 'diameter')]), undefined, { projectUnits: { length: 'mm' } })
    expect((metric.values.c.candidates as import('../domain/types').PierCandidate[])[0].geometry.D).toBe(3)
    expect(metric.resolvedInputs.c.diameter).toMatchObject({ value: 3, quantityKind: 'length', unit: 'mm' })
  })

  it('converts raw numeric[] Range values to the target Length unit on Run', async () => {
    const range = node('r', 'input.range'); range.parameters = { min: 2, max: 3, step: .5, quantityKind: 'dimensionless', unit: '1' }
    const pier = node('p', 'substructure.pier.circular'); pier.parameters = getNodeDefinition(pier.type)!.createDefaultParameters()
    const result = await executeGraph(graph([range, pier], [edge('range', 'r', 'values', 'p', 'diameter')]), undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    expect((result.values.p.candidates as import('../domain/types').PierCandidate[]).map(candidate => candidate.geometry.D)).toEqual([2, 2.5, 3])
    expect((result.resolvedInputs.p.diameter as import('../domain/quantities').EngineeringQuantity[]).map(item => item.value)).toEqual([2, 2.5, 3])
  })

  it('preserves explicit Quantity units instead of reinterpreting them from Project Units', async () => {
    const quantity = node('q', 'input.quantity'); quantity.parameters = { value: 3000, quantityKind: 'length', unit: 'mm' }
    const pier = node('p', 'substructure.pier.circular'); pier.parameters = getNodeDefinition(pier.type)!.createDefaultParameters()
    const result = await executeGraph(graph([quantity, pier], [edge('q', 'q', 'value', 'p', 'diameter')]), undefined, { projectUnits: { length: 'ft' } })
    expect(result.errors).toEqual({})
    expect((result.values.p.candidates as import('../domain/types').PierCandidate[])[0].geometry.D).toBe(3)
    expect(result.resolvedInputs.p.diameter).toMatchObject({ value: 3, quantityKind: 'length', unit: 'mm' })
  })

  it('executes the full Number/Integer/Concrete → Rectangular Pier → Watch chain', async () => {
    const width = node('b', 'input.number', 4), depth = node('d', 'input.number', 4), height = node('h', 'input.number', 12), columns = node('cols', 'input.integer', 2)
    const concrete = node('conc', 'material.concrete'); concrete.parameters = { materialId: 'C40/50' }
    const pier = node('pier', 'substructure.pier.rectangular'); pier.parameters = getNodeDefinition(pier.type)!.createDefaultParameters()
    const watch = node('watch', 'output.watch')
    const result = await executeGraph(graph([width, depth, height, columns, concrete, pier, watch], [
      edge('b', 'b', 'value', 'pier', 'width'), edge('d', 'd', 'value', 'pier', 'depth'), edge('h', 'h', 'value', 'pier', 'height'),
      edge('cols', 'cols', 'value', 'pier', 'columns'), edge('conc', 'conc', 'material', 'pier', 'material'), edge('watch', 'pier', 'candidates', 'watch', 'value'),
    ]), undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    const candidate = (result.values.pier.candidates as import('../domain/types').PierCandidate[])[0]
    expect(candidate).toMatchObject({ pierType: 'RECTANGULAR', geometry: { B: 4, D: 4 }, heightM: 12, columnCount: 2, material: { id: 'C40/50' } })
    expect(result.watchValues.watch).toEqual([candidate])
    expect(result.logs.at(-1)?.message).toContain('completed')
  })

  it('allows Integer on a continuous Pier Length input but keeps Integer outputs and Columns discrete', async () => {
    const integer = node('n', 'input.integer', 3), pier = node('p', 'substructure.pier.circular')
    pier.parameters = getNodeDefinition(pier.type)!.createDefaultParameters()
    const candidateGraph = graph([integer, pier], [edge('e', 'n', 'value', 'p', 'diameter')])
    expect(validateConnection(graph([integer, pier]), { sourceNodeId: 'n', sourcePortId: 'value', targetNodeId: 'p', targetPortId: 'diameter' })).toBeUndefined()
    expect(canConnect('integer', 'integer')).toBe(true)
    expect(canConnect('number', 'integer')).toBe(false)
    const result = await executeGraph(candidateGraph, undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    expect(result.values.p.candidates).toMatchObject([{ geometry: { D: 3 } }])
    expect(result.resolvedInputs.p.diameter).toMatchObject({ value: 3, quantityKind: 'length', unit: 'm' })
  })

  it('does not allow a Length Range to be reinterpreted as a Foundation pile count',()=>{
    const range=node('r','input.range');range.parameters={min:3,max:5,step:1,quantityKind:'length',unit:'m'}
    const foundation=node('f','substructure.foundation.piled');foundation.parameters=getNodeDefinition(foundation.type)!.createDefaultParameters({length:'m'})
    expect(validateConnection(graph([range,foundation]),{sourceNodeId:'r',sourcePortId:'values',targetNodeId:'f',targetPortId:'pileCountX'})).toMatchObject({nodeId:'f'})
    range.parameters={min:3,max:5,step:1,quantityKind:'dimensionless',unit:'1'}
    expect(validateConnection(graph([range,foundation]),{sourceNodeId:'r',sourcePortId:'values',targetNodeId:'f',targetPortId:'pileCountX'})).toBeUndefined()
  })

  it('executes live-capable shallow and piled Foundation geometry with Range, Math, Concrete, Watch and List',async()=>{
    const diameter=node('d','input.number',1.2),count=node('nx','input.range'),spacing=node('ax','input.range'),math=node('multiply','math.multiply'),concrete=node('c','material.concrete'),piled=node('f','substructure.foundation.piled'),watch=node('w','output.watch'),list=node('l','output.list')
    count.parameters={min:3,max:5,step:1,quantityKind:'dimensionless',unit:'1'}
    spacing.parameters={min:1.5,max:2,step:.5,quantityKind:'length',unit:'m'}
    concrete.parameters={materialId:'C35/45'}
    piled.parameters=getNodeDefinition(piled.type)!.createDefaultParameters({length:'m'})
    const result=await executeGraph(graph([diameter,count,spacing,math,concrete,piled,watch,list],[
      edge('d','d','value','f','pileDiameter'),edge('nx','nx','values','f','pileCountX'),edge('range-math','ax','values','multiply','a'),edge('diameter-math','d','value','multiply','b'),edge('math-spacing','multiply','result','f','pileSpacingX'),edge('concrete','c','material','f','material'),edge('watch','f','candidates','w','value'),edge('list','f','candidates','l','items'),
    ]),undefined,{projectUnits:{length:'m'}})
    expect(result.errors).toEqual({})
    const candidates=result.values.f.candidates as import('../domain/types').FoundationCandidate[]
    expect(candidates).toHaveLength(6)
    expect(candidates[0]).toMatchObject({foundationType:'PILED',geometry:{pileDiameter:1.2,pileCountX:3,derived:{Lx:6,Ly:9.6}},material:{id:'C35/45'}})
    expect(candidates[0].geometry.pileSpacingX).toBeCloseTo(1.8,12)
    expect(result.watchValues.w).toEqual(candidates)
    expect(result.values.l.value).toEqual(candidates)
  })

  it('generates one Rectangular Pier from mixed connected and local inputs and lists it', async () => {
    const width = node('b', 'input.number', 3), depth = node('d', 'input.integer', 4), concrete = node('c', 'material.concrete')
    concrete.parameters = { materialId: 'C40/50' }
    const pier = node('p', 'substructure.pier.rectangular')
    pier.parameters = { ...getNodeDefinition(pier.type)!.createDefaultParameters({ length: 'm' }), heightValue: 10, heightUnit: 'm', columns: 1 }
    const list = node('l', 'output.list')
    const result = await executeGraph(graph([list, pier, concrete, depth, width], [
      edge('b', 'b', 'value', 'p', 'width'), edge('d', 'd', 'value', 'p', 'depth'), edge('c', 'c', 'material', 'p', 'material'), edge('pl', 'p', 'candidates', 'l', 'items'),
    ]), undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    expect(result.values.p).toMatchObject({ generatedCombinations: 1, invalidCombinations: 0, candidates: [{ pierType: 'RECTANGULAR', geometry: { B: 3, D: 4 }, heightM: 10, columnCount: 1, material: { id: 'C40/50' } }] })
    expect(result.values.l.value).toEqual(result.values.p.candidates)
    expect(result.resolvedInputs.p.width).toMatchObject({ value: 3, quantityKind: 'length', unit: 'm' })
    expect(result.resolvedInputs.p.depth).toMatchObject({ value: 4, quantityKind: 'length', unit: 'm' })
  })

  it('executes Range → Pier → List in dependency order with three candidates', async () => {
    const range = node('r', 'input.range'); range.parameters = { min: 2, max: 4, step: 1, quantityKind: 'dimensionless', unit: '1' }
    const depth = node('d', 'input.integer', 4), pier = node('p', 'substructure.pier.rectangular')
    pier.parameters = { ...getNodeDefinition(pier.type)!.createDefaultParameters({ length: 'm' }), DValue: 4, DUnit: 'm', heightValue: 10, heightUnit: 'm', columns: 1, materialId: 'C40/50' }
    const list = node('l', 'output.list')
    const result = await executeGraph(graph([list, pier, depth, range], [edge('b', 'r', 'values', 'p', 'width'), edge('d', 'd', 'value', 'p', 'depth'), edge('pl', 'p', 'candidates', 'l', 'items')]), undefined, { projectUnits: { length: 'm' } })
    expect(result.errors).toEqual({})
    expect(result.values.p.candidates).toHaveLength(3)
    expect((result.values.p.candidates as import('../domain/types').PierCandidate[]).map(candidate => candidate.geometry.B)).toEqual([2, 3, 4])
    expect(result.values.l.value).toHaveLength(3)
  })
})
