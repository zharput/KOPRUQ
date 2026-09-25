import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EngineeringNodeShell from './EngineeringNodeShell'
import { ReactFlowProvider } from '@xyflow/react'
import { getNodeDefinitions } from '../registry/nodeRegistry'
import { toReactFlowNodes } from '../adapters/reactFlowAdapter'
import type { KopruqGraph } from '../domain/types'

describe('reusable engineering node shell', () => {
  it('renders the compact abutment node and keeps edits on the graph callback', () => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type === 'structural.abutment')!
    const onParameterChange = vi.fn()
    const graph: KopruqGraph = { id: 'abutment-shell', name: 'abutment shell', schemaVersion: 1, nodes: [{ id: 'abutment', type: definition.type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange, projectUnits: { length: 'm' } })
    const { container } = render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={false} definition={definition} /></ReactFlowProvider>)
    expect(container.textContent).toContain('ABUTMENT GEOMETRY')
    expect(container.textContent).toContain('SEISMIC BLOCK')
    expect(container.textContent).not.toContain('UPSTREAM INPUTS')
    expect(container.textContent).not.toContain('CALCULATED RESULTS')
    expect(container.textContent).not.toContain('FAMILY / RANGE')
    expect(container.querySelectorAll('.spn-engineering-inputs input')).toHaveLength(9)
    for (const label of ['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d','sei_u']) expect(container.textContent).toContain(label)
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(13)
    expect(container.textContent).not.toContain('Front_fh')
    expect(container.textContent).not.toContain('Foun_fh')
    expect(container.querySelectorAll('.spn-engineering-output-row')).toHaveLength(definition.outputs.length)
    expect(container.textContent).not.toContain('[object Object]')
  })

  it.each(['substructure.foundation.shallow','substructure.foundation.piled'])('renders %s with the shared orange family theme and engineering-only labels',(type)=>{
    const definition=getNodeDefinitions('STRUCTURAL_FAMILY').find(item=>item.type===type)!
    const graph:KopruqGraph={id:'foundation-shell',name:'foundation shell',schemaVersion:1,nodes:[{id:'foundation',type,name:definition.label,position:{x:0,y:0},parameters:definition.createDefaultParameters({length:'m'})}],connections:[]}
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
    const graph:KopruqGraph={id:'caps',name:'cap shell',schemaVersion:1,nodes:[{id:'cap',type,name:definition.label,position:{x:0,y:0},parameters:definition.createDefaultParameters({length:'m'})}],connections:[]}
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
    const graph: KopruqGraph = { id: 'g', name: 'test', schemaVersion: 1, nodes: [{ id: 'pier', type: definition.type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }], connections: [] }
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
    const graph: KopruqGraph = { id: 'status', name: 'category status', schemaVersion: 1, nodes: [{ id: 'pier', type: definition.type, name: 'Pier', position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange: vi.fn(), states: { pier: 'error' }, errors: { pier: 'Invalid pier input.' } })
    const { container } = render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={true} definition={definition} /></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family', 'is-selected', 'has-error')
    expect(container.querySelector('.spn-graph-node-state')).toHaveTextContent('ERROR')
  })

  it('previews resolved Number, Integer, Concrete values and candidate count without Run', () => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type === 'substructure.pier.rectangular')!
    const graph: KopruqGraph = { id: 'g', name: 'preview', schemaVersion: 1, nodes: [
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

  it.each([
    ['substructure.pier.circular', 'Diameter', 'DValue', 2],
    ['substructure.pier.rectangular', 'B - Transverse', 'BValue', 3],
    ['substructure.pier.box', 'B - Transverse', 'BValue', 3],
    ['substructure.pier.h_section', 'B - Transverse', 'BValue', 3],
  ])('projects %s local lengths through the active project unit', (type, label, _parameter, canonical) => {
    const definition = getNodeDefinitions('STRUCTURAL_FAMILY').find(item => item.type === type)!
    const graph: KopruqGraph = { id: `units-${type}`, name: 'units', schemaVersion: 1, nodes: [{ id: 'pier', type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'cm' }) }], connections: [] }
    const { container, rerender } = render(<ReactFlowProvider><EngineeringNodeShell data={toReactFlowNodes(graph, { projectUnits: { length: 'cm' }, onParameterChange: vi.fn() })[0].data} selected={false} definition={definition} /></ReactFlowProvider>)
    expect(container.querySelector(`input[aria-label="${label} local default"]`)).toHaveValue(String(canonical * 100))
    const data = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() })[0].data
    rerender(<ReactFlowProvider><EngineeringNodeShell data={data} selected={false} definition={definition} /></ReactFlowProvider>)
    expect(container.querySelector(`input[aria-label="${label} local default"]`)).toHaveValue(String(canonical))
  })

  it('shows grouped bearing inputs and the resolved stiffness range instead of its source name',()=>{
    const definition=getNodeDefinitions('STRUCTURAL_FAMILY').find(item=>item.type==='substructure.bearing.elastomeric')!
    const graph:KopruqGraph={id:'bearing-shell',name:'bearing shell',schemaVersion:1,nodes:[
      {id:'range',type:'input.range',name:'Range-2',position:{x:0,y:0},parameters:{min:2000,max:5000,step:3000,quantityKind:'dimensionless',unit:'1'}},
      {id:'bearing',type:definition.type,name:definition.label,position:{x:300,y:0},parameters:definition.createDefaultParameters({length:'m'})},
    ],connections:[{id:'range-kx',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'bearing',targetPortId:'kx'}]}
    const node=toReactFlowNodes(graph,{projectUnits:{length:'m'},onParameterChange:vi.fn()}).find(item=>item.id==='bearing')!
    const {container}=render(<ReactFlowProvider><EngineeringNodeShell data={node.data} selected={false} definition={definition}/></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-structural-family')
    expect(container.textContent).toContain('GEOMETRY')
    expect(container.textContent).toContain('STIFFNESS')
    expect(container.textContent).toContain('2000.00…5000.00 kN/m')
    expect(container.textContent).not.toContain('Range-2')
    expect(container.textContent).not.toContain('translationalStiffness')
    expect(container.textContent).not.toContain('quantity[]')
    expect(container.querySelectorAll('.spn-engineering-input-row')).toHaveLength(9)
    expect(container.querySelector('.spn-engineering-output-value')).toHaveTextContent('2 candidates')
  })
})
