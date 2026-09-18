import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EngineeringNodeShell from './EngineeringNodeShell'
import { ReactFlowProvider } from '@xyflow/react'
import { getNodeDefinitions } from '../registry/nodeRegistry'
import { toReactFlowNodes } from '../adapters/reactFlowAdapter'
import type { SpanovaGraph } from '../domain/types'

describe('reusable engineering node shell', () => {
  it.each(['substructure.foundation.shallow','substructure.foundation.piled'])('renders %s with the shared orange family theme and engineering-only labels',(type)=>{
    const definition=getNodeDefinitions('STRUCTURAL_FAMILY').find(item=>item.type===type)!
    const graph:SpanovaGraph={id:'foundation-shell',name:'foundation shell',schemaVersion:1,nodes:[{id:'foundation',type,name:definition.label,position:{x:0,y:0},parameters:definition.createDefaultParameters({length:'m'})}],connections:[]}
    const [node]=toReactFlowNodes(graph,{onParameterChange:vi.fn(),projectUnits:{length:'m'}})
    const {container}=render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={false} definition={definition}/></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family')
    expect(container.textContent).not.toContain('length[]')
    expect(container.textContent).not.toContain('foundationCandidate[]')
    expect(container.textContent).toContain('1 candidate')
    if(type.endsWith('piled'))expect(container.querySelector('.spn-engineering-derived')?.textContent).toContain('13.20 m')
  })
  it.each(['substructure.pier-cap.rectangular','substructure.pier-cap.t'])('renders %s with shared structural styling and clean engineering labels',(type)=>{
    const definition=getNodeDefinitions('STRUCTURAL_FAMILY').find(item=>item.type===type)!
    const graph:SpanovaGraph={id:'caps',name:'cap shell',schemaVersion:1,nodes:[{id:'cap',type,name:definition.label,position:{x:0,y:0},parameters:definition.createDefaultParameters({length:'m'})}],connections:[]}
    const [node]=toReactFlowNodes(graph,{onParameterChange:vi.fn(),projectUnits:{length:'m'}})
    const {container}=render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={false} definition={definition}/></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family')
    expect(container.querySelectorAll('.spn-engineering-input-row')).toHaveLength(definition.inputs.length)
    expect(container.textContent).toContain('C40/50')
    expect(container.textContent).not.toContain('concreteMaterial')
    expect(container.textContent).not.toContain('length[]')
    expect(container.querySelector('.spn-engineering-output-value')).toHaveTextContent('1 candidate')
  })
  it.each(['CIRCULAR', 'RECTANGULAR', 'OVAL', 'BOX', 'H_SECTION'])('lays out %s ports on separate rows without canvas type noise', (shape) => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type.endsWith(shape.toLowerCase()))!
    const graph: SpanovaGraph = { id: 'g', name: 'test', schemaVersion: 1, nodes: [{ id: 'pier', type: definition.type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange: vi.fn(), projectUnits: { length: 'm' } })
    const { container } = render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={false} definition={definition} /></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family')
    expect(screen.getByText(definition.label)).toBeInTheDocument()
    expect(container.querySelectorAll('.spn-engineering-input-row')).toHaveLength(definition.inputs.length)
    expect(container.querySelectorAll('.spn-engineering-output-row')).toHaveLength(1)
    expect(container.querySelectorAll('.spn-engineering-input-row .react-flow__handle')).toHaveLength(definition.inputs.length)
    expect(container.querySelectorAll('.spn-engineering-output-row .react-flow__handle')).toHaveLength(1)
    expect(container.textContent).not.toContain('length[]')
    expect(container.textContent).not.toContain('pierCandidate[]')
  })

  it('keeps selected and error status markers alongside structural family category identity', () => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type === 'substructure.pier.rectangular')!
    const graph: SpanovaGraph = { id: 'status', name: 'category status', schemaVersion: 1, nodes: [{ id: 'pier', type: definition.type, name: 'Pier', position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange: vi.fn(), states: { pier: 'error' }, errors: { pier: 'Invalid pier input.' } })
    const { container } = render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={true} definition={definition} /></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family', 'is-selected', 'has-error')
    expect(container.querySelector('.spn-graph-node-state')).toHaveTextContent('ERROR')
  })

  it('previews resolved Number, Integer, Concrete values and candidate count without Run', () => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type === 'substructure.pier.rectangular')!
    const graph: SpanovaGraph = { id: 'g', name: 'preview', schemaVersion: 1, nodes: [
      { id: 'b', type: 'input.number', name: 'Number-1', position: { x: 0, y: 0 }, parameters: { value: 3 } },
      { id: 'd', type: 'input.integer', name: 'Integer-1', position: { x: 0, y: 80 }, parameters: { value: 4 } },
      { id: 'c', type: 'material.concrete', name: 'Concrete-1', position: { x: 0, y: 160 }, parameters: { materialId: 'C40/50' } },
      { id: 'p', type: definition.type, name: 'Rectangular Pier', position: { x: 240, y: 40 }, parameters: definition.createDefaultParameters({ length: 'm' }) },
    ], connections: [
      { id: 'b', sourceNodeId: 'b', sourcePortId: 'value', targetNodeId: 'p', targetPortId: 'width' },
      { id: 'd', sourceNodeId: 'd', sourcePortId: 'value', targetNodeId: 'p', targetPortId: 'depth' },
      { id: 'c', sourceNodeId: 'c', sourcePortId: 'material', targetNodeId: 'p', targetPortId: 'material' },
    ] }
    const projected = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() })
    const pier = projected.find(item => item.id === 'p')!
    const { container } = render(<ReactFlowProvider><EngineeringNodeShell data={pier.data} selected={false} definition={definition} /></ReactFlowProvider>)
    expect(container.textContent).toContain('3.00 m')
    expect(container.textContent).toContain('4.00 m')
    expect(container.textContent).toContain('C40/50')
    expect(screen.getByText('1 candidate')).toBeInTheDocument()
    expect(container.textContent).not.toContain('Connected')
    expect(pier.data.outputs?.candidates).toBeUndefined()
    expect(pier.data.connectedInputs?.width?.value).toMatchObject({ value: 3, quantityKind: 'length', unit: 'm' })
  })
})
