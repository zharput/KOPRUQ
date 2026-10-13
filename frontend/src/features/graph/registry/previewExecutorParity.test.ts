import { describe, expect, it } from 'vitest'
import { toReactFlowNodes } from '../adapters/reactFlowAdapter'
import type { GraphValue, KopruqGraph, KopruqNode } from '../domain/types'
import { getUnit } from '../domain/quantities'
import { localLength } from '../domain/pierCandidates'
import { createNode, getNodeDefinition, NODE_REGISTRY, previewDesignOutput, type NodeDefinition } from './nodeRegistry'

/**
 * G4 / A-04 characterization + parity.
 *
 * - GOLDEN pins the executor output (services-less) for every cell of the
 *   matrix, so the preview/executor unification must not change a single
 *   executor result (AC4). Hashes are produced from a canonical JSON dump.
 * - Parity compares `previewDesignOutput` with the executor for every output
 *   port (AC5-AC7). `KNOWN_DIVERGENT` lists cells that diverge before the
 *   unification; they are expected to be removed when the preview is unified.
 */
const TYPES = [
  'substructure.pier.circular', 'substructure.pier.rectangular', 'substructure.pier.oval', 'substructure.pier.box', 'substructure.pier.h_section',
  'substructure.pier-cap.rectangular', 'substructure.pier-cap.t',
  'substructure.foundation.shallow', 'substructure.foundation.piled',
  'substructure.bearing.elastomeric',
  'structural.girder.precast', 'structural.girder.steel',
  'structural.superstructure', 'structural.span_arrangement', 'structural.abutment',
  'input.range', 'math.add', 'math.subtract', 'math.multiply', 'math.divide',
] as const
const UNITS = ['m', 'mm'] as const
type Case = 'default' | 'connected'

/** The preview-capable type set that reactFlowAdapter used to hard-code. */
export const PREVIEW_TYPES_BEFORE = [...TYPES]

function cyrb53(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761); h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

async function settle<T>(fn: () => T | Promise<T>): Promise<{ value: T } | { error: string }> {
  try { return { value: await fn() } } catch (cause) { return { error: cause instanceof Error ? cause.message : String(cause) } }
}

function makeNode(definition: NodeDefinition, unit: string): KopruqNode {
  return createNode(definition, { id: 'n', name: 'n', position: { x: 0, y: 0 }, projectUnits: { length: unit } })
}

async function run(type: string, unit: string, inputs: Record<string, GraphValue>) {
  const definition = getNodeDefinition(type)!
  const node = makeNode(definition, unit)
  return { definition, node, outputs: await definition.executor({ node, inputs }) }
}

/** Real executor outputs chained as upstream fixtures. */
async function chain() {
  const girder = (await run('structural.girder.steel', 'm', {})).outputs.candidates
  const superstructure = (await run('structural.superstructure', 'm', { girder })).outputs.candidates
  const bearing = (await run('substructure.bearing.elastomeric', 'm', {})).outputs.candidates
  return { girder, superstructure, bearing }
}

function connectedInputs(definition: NodeDefinition, node: KopruqNode, upstream: Awaited<ReturnType<typeof chain>>): Record<string, GraphValue> {
  const type = definition.type
  if (type === 'input.range') return { start: 0, end: 4, increment: 2 }
  if (type.startsWith('math.')) return { a: [1, 2], b: 3 }
  if (type === 'structural.span_arrangement') return { bridgeLength: [localLength(200, 'm')], spanCount: 4 }
  if (type === 'structural.superstructure') return { girder: upstream.girder }
  const inputs: Record<string, GraphValue> = {}
  if (type === 'structural.abutment') { inputs.girder = upstream.girder; inputs.superstructure = upstream.superstructure; inputs.bearing = upstream.bearing }
  let first = true
  for (const port of definition.inputs) {
    if (port.id in inputs || port.id === 'material' || port.id === 'girder' || port.id === 'superstructure' || port.id === 'bearing') continue
    const schema = definition.parameterSchema.find(item => item.inputPortId === port.id && item.key.endsWith('Value'))
    if (!schema) continue
    const base = Number(node.parameters[schema.key])
    if (port.type === 'length[]' && port.quantityKind === 'length') {
      const unit = String(node.parameters[schema.key.replace(/Value$/, 'Unit')])
      const canonical = getUnit(unit)!.toCanonical(base)
      if (type === 'structural.abutment' && !first) continue
      inputs[port.id] = first ? [localLength(canonical, 'm'), localLength(canonical * 1.25, 'm')] : [localLength(canonical * 1.1, 'm')]
      first = false
    }
  }
  return inputs
}

type Cell = { key: string; type: string; unit: string; kase: Case }
const CELLS: Cell[] = TYPES.flatMap(type => UNITS.flatMap(unit => (['default', 'connected'] as Case[]).map(kase => ({ key: `${type}|${unit}|${kase}`, type, unit, kase }))))

/** Recorded before the A-04 refactor (cyrb53 over JSON of the services-less executor result or error). */
const GOLDEN: Record<string, string> = {
  'substructure.pier.circular|m|default': '1e11b40dfb381d',
  'substructure.pier.circular|m|connected': '1c51360d13bf0c',
  'substructure.pier.circular|mm|default': '1e11b40dfb381d',
  'substructure.pier.circular|mm|connected': '1c51360d13bf0c',
  'substructure.pier.rectangular|m|default': '1ab15bb0925311',
  'substructure.pier.rectangular|m|connected': '11d9b494948cc6',
  'substructure.pier.rectangular|mm|default': '1ab15bb0925311',
  'substructure.pier.rectangular|mm|connected': '11d9b494948cc6',
  'substructure.pier.oval|m|default': '228f45e994029',
  'substructure.pier.oval|m|connected': '1c9d8d0f8a61f1',
  'substructure.pier.oval|mm|default': '228f45e994029',
  'substructure.pier.oval|mm|connected': '1c9d8d0f8a61f1',
  'substructure.pier.box|m|default': '1c08f68dfcdfa0',
  'substructure.pier.box|m|connected': '19a97566a2cfeb',
  'substructure.pier.box|mm|default': '1c08f68dfcdfa0',
  'substructure.pier.box|mm|connected': '19a97566a2cfeb',
  'substructure.pier.h_section|m|default': 'ae8167c99ca4d',
  'substructure.pier.h_section|m|connected': 'c41f93d218c25',
  'substructure.pier.h_section|mm|default': 'ae8167c99ca4d',
  'substructure.pier.h_section|mm|connected': 'c41f93d218c25',
  'substructure.pier-cap.rectangular|m|default': '11ea4193a58923',
  'substructure.pier-cap.rectangular|m|connected': 'e22cdb7f57b33',
  'substructure.pier-cap.rectangular|mm|default': '11ea4193a58923',
  'substructure.pier-cap.rectangular|mm|connected': 'e22cdb7f57b33',
  'substructure.pier-cap.t|m|default': '1f551daac9ae29',
  'substructure.pier-cap.t|m|connected': '778d77d7f387f',
  'substructure.pier-cap.t|mm|default': '1f551daac9ae29',
  'substructure.pier-cap.t|mm|connected': '778d77d7f387f',
  'substructure.foundation.shallow|m|default': '194c02044096e5',
  'substructure.foundation.shallow|m|connected': '18cbd6f2403809',
  'substructure.foundation.shallow|mm|default': '194c02044096e5',
  'substructure.foundation.shallow|mm|connected': '18cbd6f2403809',
  'substructure.foundation.piled|m|default': '1e1b3f6e2f95c5',
  'substructure.foundation.piled|m|connected': 'ad04e34f0f74f',
  'substructure.foundation.piled|mm|default': '1e1b3f6e2f95c5',
  'substructure.foundation.piled|mm|connected': 'ad04e34f0f74f',
  'substructure.bearing.elastomeric|m|default': '5f65c48b8fe8a',
  'substructure.bearing.elastomeric|m|connected': '1ffc9af609dcfc',
  'substructure.bearing.elastomeric|mm|default': '584ab12ac9852',
  'substructure.bearing.elastomeric|mm|connected': '2c6f2dc0332c4',
  'structural.girder.precast|m|default': 'fed7a6c7b1853',
  'structural.girder.precast|m|connected': '12b55cb23eea9c',
  'structural.girder.precast|mm|default': '1b8b23a876a3c1',
  'structural.girder.precast|mm|connected': '14cf249c72573f',
  'structural.girder.steel|m|default': '134a3efb2354c6',
  'structural.girder.steel|m|connected': '117ca80c5bb3ce',
  'structural.girder.steel|mm|default': '134a3efb2354c6',
  'structural.girder.steel|mm|connected': '117ca80c5bb3ce',
  'structural.superstructure|m|default': '14a07ebf8c7a3b',
  'structural.superstructure|m|connected': 'fb0b48b012afd',
  'structural.superstructure|mm|default': '14a07ebf8c7a3b',
  'structural.superstructure|mm|connected': '701e94d1eabe',
  'structural.span_arrangement|m|default': '188665b8732c86',
  'structural.span_arrangement|m|connected': '1de9462d5fdeca',
  'structural.span_arrangement|mm|default': '9c493745d5dac',
  'structural.span_arrangement|mm|connected': 'e23f003c5c802',
  'structural.abutment|m|default': '1971d7804adb3c',
  'structural.abutment|m|connected': '1270857e01759c',
  'structural.abutment|mm|default': '1971d7804adb3c',
  'structural.abutment|mm|connected': '1270857e01759c',
  'input.range|m|default': '3a383a9379c37',
  'input.range|m|connected': '1a13bef1f828e6',
  'input.range|mm|default': '3a383a9379c37',
  'input.range|mm|connected': '1a13bef1f828e6',
  'math.add|m|default': '1da14e38e716c2',
  'math.add|m|connected': '15ff5428f9bcf6',
  'math.add|mm|default': '1da14e38e716c2',
  'math.add|mm|connected': '15ff5428f9bcf6',
  'math.subtract|m|default': '1da14e38e716c2',
  'math.subtract|m|connected': '40de2bea783f2',
  'math.subtract|mm|default': '1da14e38e716c2',
  'math.subtract|mm|connected': '40de2bea783f2',
  'math.multiply|m|default': '1da14e38e716c2',
  'math.multiply|m|connected': '1713fa421aabf6',
  'math.multiply|mm|default': '1da14e38e716c2',
  'math.multiply|mm|connected': '1713fa421aabf6',
  'math.divide|m|default': '1da14e38e716c2',
  'math.divide|m|connected': '19fa924e7c9504',
  'math.divide|mm|default': '1da14e38e716c2',
  'math.divide|mm|connected': '19fa924e7c9504',
}

/**
 * Cells whose preview differs from the executor. Before the A-04 unification this listed 10 cells
 * (precast girder x4: candidate id key order; steel girder mm x2: span values; abutment x4: wrong field names).
 */
const KNOWN_DIVERGENT: ReadonlySet<string> = new Set<string>([])

describe('preview / executor parity matrix (G4 A-04)', () => {
  it('covers the expected preview-capable type set', () => {
    expect(PREVIEW_TYPES_BEFORE).toHaveLength(20)
    for (const type of PREVIEW_TYPES_BEFORE) expect(getNodeDefinition(type)).toBeDefined()
  })

  it('the registry-derived preview type set equals the previously hard-coded list (and excludes structural.assembly)', () => {
    const derived = NODE_REGISTRY.filter(definition => definition.preview).map(definition => definition.type).sort()
    expect(derived).toEqual([...PREVIEW_TYPES_BEFORE].sort())
    expect(getNodeDefinition('structural.assembly')?.preview).toBeUndefined()
  })

  it('executor outputs match the recorded golden hashes (AC4)', async () => {
    const upstream = await chain()
    const actual: Record<string, string> = {}
    for (const cell of CELLS) {
      const definition = getNodeDefinition(cell.type)!
      const node = makeNode(definition, cell.unit)
      const inputs = cell.kase === 'default' ? {} : connectedInputs(definition, node, upstream)
      actual[cell.key] = cyrb53(JSON.stringify(await settle(() => definition.executor({ node, inputs }))))
    }
    if (Object.keys(GOLDEN).length === 0) console.log('GOLDEN_JSON=' + JSON.stringify(actual))
    expect(actual).toEqual(GOLDEN)
  })

  for (const cell of CELLS) {
    const register = KNOWN_DIVERGENT.has(cell.key) ? it.fails : it
    register(`preview equals executor: ${cell.key}`, async () => {
      const upstream = await chain()
      const definition = getNodeDefinition(cell.type)!
      const node = makeNode(definition, cell.unit)
      const inputs = cell.kase === 'default' ? {} : connectedInputs(definition, node, upstream)
      const executed = await settle(() => definition.executor({ node, inputs }))
      for (const port of definition.outputs) {
        const previewed = await settle(() => previewDesignOutput(node, port.id, inputs))
        if ('error' in executed) expect(previewed, `${cell.key}:${port.id}`).toEqual(executed)
        else expect(previewed, `${cell.key}:${port.id}`).toEqual({ value: executed.value[port.id] })
      }
    })
  }
})

describe('girder preview in a millimetre project (AC6)', () => {
  it('shows the steel girder preferred span and applicable range in metres, like Run', () => {
    const node = makeNode(getNodeDefinition('structural.girder.steel')!, 'mm')
    const [candidate] = previewDesignOutput(node, 'candidates', {}) as unknown as Array<{ preferredSpan: number; applicableSpanRange: { min: number; max: number } }>
    expect(candidate.preferredSpan).toBe(60)
    expect(candidate.applicableSpanRange).toEqual({ min: 30, max: 90 })
  })
})

describe('abutment preview in the React Flow adapter (G4 A-04, AC7)', () => {
  const abutmentGraph = (): KopruqGraph => {
    const definition = getNodeDefinition('structural.abutment')!
    const node = makeNode(definition, 'm')
    return { id: 'g', name: 'g', schemaVersion: 1, nodes: [node, { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 300, y: 0 }, parameters: {} }], connections: [{ id: 'c', sourceNodeId: 'n', sourcePortId: 'candidates', targetNodeId: 'watch', targetPortId: 'value' }] }
  }

  it('does not mark the abutment node as errored before Run and previews an empty list without upstream', () => {
    const nodes = toReactFlowNodes(abutmentGraph(), { onParameterChange: () => undefined })
    const abutment = nodes.find(item => item.id === 'n')!
    expect(abutment.data.executionState).toBe('idle')
    expect(abutment.data.executionError).toBeUndefined()
    expect(abutment.data.previewAbutmentCandidates).toEqual([])
  })
})

describe('superstructure preview guard: documented exception to preview == executor parity (G4 P3-1)', () => {
  const superstructureNode = (patch: Record<string, number | string> = {}): KopruqNode => {
    const node = makeNode(getNodeDefinition('structural.superstructure')!, 'm')
    return { ...node, parameters: { ...node.parameters, ...patch } }
  }
  const graphOf = (node: KopruqNode): KopruqGraph => ({ id: 'g', name: 'g', schemaVersion: 1, nodes: [node, { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 300, y: 0 }, parameters: {} }], connections: [{ id: 'c', sourceNodeId: node.id, sourcePortId: 'candidates', targetNodeId: 'watch', targetPortId: 'value' }] })

  // EXCEPTION: with no connected girder the live preview returns [] without throwing (pre-G4 behaviour),
  // whereas the executor still validates its length inputs and throws. This is the only intended
  // preview/executor difference besides material resolution (preview never resolves materials, D3).
  it('with no girder and an invalid Deck Width the preview returns [] without throwing, while the executor throws', async () => {
    const node = superstructureNode({ deckWidthValue: Number.NaN })
    expect(previewDesignOutput(node, 'candidates', {})).toEqual([])
    await expect(Promise.resolve().then(() => getNodeDefinition('structural.superstructure')!.executor({ node, inputs: {} }))).rejects.toThrow()
  })

  it('with no girder the adapter does not mark the node as errored before Run', () => {
    const nodes = toReactFlowNodes(graphOf(superstructureNode({ deckWidthValue: Number.NaN })), { onParameterChange: () => undefined })
    const node = nodes.find(item => item.id === 'n')!
    expect(node.data.executionState).not.toBe('error')
    expect(node.data.executionError).toBeUndefined()
  })

  it('with a connected girder the preview equals the executor (parity holds)', async () => {
    const upstream = await chain()
    const node = superstructureNode()
    const executed = await getNodeDefinition('structural.superstructure')!.executor({ node, inputs: { girder: upstream.girder } })
    expect(previewDesignOutput(node, 'candidates', { girder: upstream.girder })).toEqual(executed.candidates)
  })

  it('with a connected girder and an invalid Deck Width the preview still throws like the executor', async () => {
    const upstream = await chain()
    expect(() => previewDesignOutput(superstructureNode({ deckWidthValue: Number.NaN }), 'candidates', { girder: upstream.girder })).toThrow()
  })
})

describe('concrete material resolution through services (G4 P3-2)', () => {
  const concreteTypes = ['substructure.pier.circular', 'substructure.pier-cap.rectangular', 'substructure.foundation.shallow'] as const
  const resolved = (id: string) => ({ domainType: 'ConcreteMaterial' as const, id, name: `resolved ${id}`, properties: { fck: { value: 12345, quantityKind: 'stress' as const, unit: 'MPa' as const } } })
  const materialsOf = (candidates: unknown) => (candidates as Array<{ material: unknown }>).map(item => item.material)

  for (const type of concreteTypes) {
    describe(type, () => {
      const definition = getNodeDefinition(type)!
      const node = makeNode(definition, 'm')

      it('calls the resolver for a string material id and puts the resolved properties in the output', async () => {
        const calls: string[] = []
        const services = { resolveConcreteMaterial: async (id: string) => { calls.push(id); return resolved(id) } }
        const output = await definition.executor({ node, inputs: {}, services })
        expect(calls).toEqual([String(node.parameters.materialId)])
        const materials = materialsOf(output.candidates)
        expect(materials.length).toBeGreaterThan(0)
        for (const material of materials) expect(material).toEqual(resolved(String(node.parameters.materialId)))
      })

      it('uses the connected string id (not the local default) when resolving', async () => {
        const calls: string[] = []
        const services = { resolveConcreteMaterial: async (id: string) => { calls.push(id); return resolved(id) } }
        await definition.executor({ node, inputs: { material: 'C50/60' as unknown as GraphValue }, services })
        expect(calls).toEqual(['C50/60'])
      })

      it('passes an object material through without calling the resolver', async () => {
        const calls: string[] = []
        const services = { resolveConcreteMaterial: async (id: string) => { calls.push(id); return resolved(id) } }
        const given = { domainType: 'ConcreteMaterial', id: 'X', name: 'X', properties: { fck: { value: 1, quantityKind: 'stress', unit: 'MPa' } } } as unknown as GraphValue
        const output = await definition.executor({ node, inputs: { material: given }, services })
        expect(calls).toEqual([])
        for (const material of materialsOf(output.candidates)) expect(material).toEqual(given)
      })

      it('uses the id-only placeholder when no resolver is provided, and the preview equals that output', async () => {
        const id = String(node.parameters.materialId)
        const withoutServices = await definition.executor({ node, inputs: {} })
        const withEmptyServices = await definition.executor({ node, inputs: {}, services: {} })
        expect(withEmptyServices).toEqual(withoutServices)
        for (const material of materialsOf(withoutServices.candidates)) expect(material).toEqual({ domainType: 'ConcreteMaterial', id, name: id, properties: {} })
        expect(previewDesignOutput(node, 'candidates', {})).toEqual(withoutServices.candidates)
      })

      it('the preview never calls the resolver (D3) and differs from a resolved Run only by the material', async () => {
        const services = { resolveConcreteMaterial: async (id: string) => resolved(id) }
        const run = await definition.executor({ node, inputs: {}, services })
        const preview = previewDesignOutput(node, 'candidates', {}) as unknown as Array<Record<string, unknown>>
        const strip = (items: unknown) => (items as Array<Record<string, unknown>>).map(({ material: _material, ...rest }) => rest)
        expect(preview.length).toBe((run.candidates as unknown[]).length)
        expect(strip(preview)).toEqual(strip(run.candidates))
        for (const material of materialsOf(preview)) expect((material as { properties: unknown }).properties).toEqual({})
      })
    })
  }
})
