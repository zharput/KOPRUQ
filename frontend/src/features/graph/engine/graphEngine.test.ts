import { describe, expect, it } from 'vitest'
import type { GraphParameterValue, SpanovaConnection, SpanovaGraph, SpanovaNode } from '../domain/types'
import { executeGraph, portCanConnect, validateConnection, validateGraph } from './graphEngine'
import { deserializeGraph, serializeGraph } from '../state/graphStore'
import { getNodeDefinition } from '../registry/nodeRegistry'

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
})
