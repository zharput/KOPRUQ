import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Position, ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it, vi } from 'vitest'
import { makeQuantity } from '../domain/quantities'
import type { GraphValue, PierCandidate, SpanovaGraph, SpanovaNode } from '../domain/types'
import { toReactFlowNodes } from '../adapters/reactFlowAdapter'
import BaseNode from './BaseNode'

function renderWatch(value: GraphValue) {
  const graph: SpanovaGraph = { id: 'g', name: 'watch test', schemaVersion: 1, nodes: [{ id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 0, y: 0 }, parameters: {} }], connections: [] }
  const [node] = toReactFlowNodes(graph, { outputs: { watch: { value } }, onParameterChange: vi.fn() })
  return render(<ReactFlowProvider><BaseNode data={node.data} selected={false} id={node.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
}

function renderCanvasNode(type: string) {
  const graph: SpanovaGraph = { id: `g-${type}`, name: type, schemaVersion: 1, nodes: [{ id: 'node', type, name: type, position: { x: 0, y: 0 }, parameters: { value: type === 'input.integer' ? 5 : 10 } }], connections: [] }
  const [node] = toReactFlowNodes(graph, { onParameterChange: vi.fn() })
  return render(<ReactFlowProvider><BaseNode data={node.data} selected={false} id={node.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
}

describe('Watch node rendering', () => {
  it('shows generic Integer List values and does not expose the technical port type on canvas',()=>{
    const node:SpanovaNode={id:'ints',type:'input.integer-list',name:'Integer List',position:{x:0,y:0},parameters:{valuesText:'3, 4, 5'}}
    const graph:SpanovaGraph={id:'g',name:'integer list',schemaVersion:1,nodes:[node],connections:[]}
    const [projected]=toReactFlowNodes(graph,{onParameterChange:vi.fn()})
    const {container}=render(<ReactFlowProvider><BaseNode data={projected.data} selected={false} id={projected.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left}/></ReactFlowProvider>)
    expect(screen.getByLabelText('Integer list values')).toHaveTextContent('3, 4, 5')
    expect(container.textContent).not.toContain('integer[]')
  })
  it('shows primitive, quantity, range and concrete values', () => {
    renderWatch(6); expect(screen.getByText('6')).toBeInTheDocument()
    renderWatch(makeQuantity(3, 'length', 'm')); expect(screen.getByText('3')).toBeInTheDocument()
    renderWatch([2, 2.5, 3]); expect(screen.getByText('[2, 2.5, 3]')).toBeInTheDocument()
    renderWatch({ domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {} }); expect(screen.getByText('Concrete C40/50')).toBeInTheDocument()
  })

  it('shows only the candidate count for execution-dependent Pier collections', () => {
    const candidate: PierCandidate = { id: 'rectangular-4_4_12_2_C40%2F50', pierType: 'RECTANGULAR', geometry: { B: 4, D: 4 }, heightM: 12, columnCount: 2, material: { domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {} } }
    renderWatch([candidate])
    expect(screen.getByText('1 candidate')).toBeInTheDocument()
    expect(screen.queryByText(/RECTANGULAR B=4.00 m/)).not.toBeInTheDocument()
    expect(screen.queryByText('No value')).not.toBeInTheDocument()
  })

  it('keeps long quantity previews compact in Watch', () => {
    renderWatch([1,2,3,4,5,6].map(value=>makeQuantity(value,'length','m')))
    expect(screen.getByText(/6 items/)).toBeInTheDocument()
    expect(screen.queryByText(/6\.00/)).not.toBeInTheDocument()
  })

  it('shows immediately available material and number source previews without Run', () => {
    const concreteGraph: SpanovaGraph = { id: 'g', name: 'preview', schemaVersion: 1, nodes: [{ id: 'concrete', type: 'material.concrete', name: 'Concrete', position: { x: 0, y: 0 }, parameters: { materialId: 'C35/45' } }, { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 200, y: 0 }, parameters: {} }], connections: [{ id: 'e', sourceNodeId: 'concrete', sourcePortId: 'material', targetNodeId: 'watch', targetPortId: 'value' }] }
    const [, watch] = toReactFlowNodes(concreteGraph, { onParameterChange: vi.fn() })
    expect(watch.data.previewValue).toMatchObject({ domainType: 'ConcreteMaterial', name: 'C35/45' })
    expect(watch.data.outputAvailability).toBe('preview')
    render(<ReactFlowProvider><BaseNode data={watch.data} selected={false} id={watch.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
    expect(screen.getByText('Concrete C35/45')).toBeInTheDocument()

    const numberGraph: SpanovaGraph = { id: 'g2', name: 'number preview', schemaVersion: 1, nodes: [{ id: 'number', type: 'input.number', name: 'Number', position: { x: 0, y: 0 }, parameters: { value: 8 } }, { id: 'watch2', type: 'output.watch', name: 'Watch', position: { x: 200, y: 0 }, parameters: {} }], connections: [{ id: 'e2', sourceNodeId: 'number', sourcePortId: 'value', targetNodeId: 'watch2', targetPortId: 'value' }] }
    expect(toReactFlowNodes(numberGraph, { onParameterChange: vi.fn() })[1].data.previewValue).toBe(8)
  })

  it('shows Run required for execution-dependent Pier candidates before execution', () => {
    const graph: SpanovaGraph = { id: 'g', name: 'run required', schemaVersion: 1, nodes: [{ id: 'pier', type: 'substructure.pier.rectangular', name: 'Pier', position: { x: 0, y: 0 }, parameters: {} }, { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 200, y: 0 }, parameters: {} }], connections: [{ id: 'e', sourceNodeId: 'pier', sourcePortId: 'candidates', targetNodeId: 'watch', targetPortId: 'value' }] }
    const watch = toReactFlowNodes(graph, { onParameterChange: vi.fn() })[1]
    expect(watch.data.outputAvailability).toBe('run-required')
    render(<ReactFlowProvider><BaseNode data={watch.data} selected={false} id={watch.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
    expect(screen.getByText('Run required')).toBeInTheDocument()
  })

  it('edits the concrete grade directly on the canvas', async () => {
    const onChange = vi.fn()
    const graph: SpanovaGraph = { id: 'g', name: 'material selector', schemaVersion: 1, nodes: [{ id: 'concrete', type: 'material.concrete', name: 'Concrete', position: { x: 0, y: 0 }, parameters: { materialId: 'C40/50' } }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange: onChange })
    const { container } = render(<ReactFlowProvider><BaseNode data={node.data} selected={false} id={node.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
    expect(container.querySelector('.spn-graph-node')).toHaveClass('category-materials')
    const selector = screen.getByRole('button', { name: 'Concrete Class' })
    expect(selector).toHaveTextContent('C40/50')
    expect(selector.parentElement).toHaveClass('nodrag')
    expect(selector.parentElement).not.toHaveClass('nowheel')
    await userEvent.click(selector)
    expect(screen.getAllByRole('option')).toHaveLength(14)
    await userEvent.click(screen.getByRole('option', { name: 'C35/45' }))
    expect(onChange).toHaveBeenCalledWith('concrete', 'materialId', 'C35/45')
  })

  it('renders editable Range Start/End/Step, an immediate value count, and disables a connected editor', async () => {
    const onChange=vi.fn(),graph:SpanovaGraph={id:'range',name:'Range',schemaVersion:1,nodes:[
      {id:'range',type:'input.range',name:'Range',position:{x:0,y:0},parameters:{min:2,max:4,step:.5,quantityKind:'dimensionless',unit:'1'}},
      {id:'number',type:'input.number',name:'Number',position:{x:0,y:100},parameters:{value:8}},
    ],connections:[{id:'edge',sourceNodeId:'number',sourcePortId:'value',targetNodeId:'range',targetPortId:'end'}]}
    const range=toReactFlowNodes(graph,{onParameterChange:onChange})[0]
    render(<ReactFlowProvider><BaseNode data={range.data} selected={false} id={range.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
    expect(screen.getByText('13 values')).toBeInTheDocument()
    const start=screen.getByRole('textbox',{name:'Range Start'}),end=screen.getByRole('textbox',{name:'Range End'}),step=screen.getByRole('textbox',{name:'Range Step'})
    expect(start).toHaveValue('2');expect(end).toBeDisabled();expect(end).toHaveValue('8');expect(step).toHaveValue('0.5')
    await userEvent.click(start);await userEvent.keyboard('{Control>}a{/Control}3{Enter}')
    expect(onChange).toHaveBeenCalledWith('range','min',3)
  })
})

describe('canvas port labels and structural family theme', () => {
  it.each([['input.number', '10'], ['input.integer', '5']])('%s keeps Value and hides the redundant port type', (type, value) => {
    const { container } = renderCanvasNode(type)
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: type === 'input.integer' ? 'Integer value' : 'Number value' })).toHaveValue(value)
    expect(container.querySelector('.spn-graph-port-row small')).toBeNull()
  })

  it.each(['math.add', 'math.subtract', 'math.multiply', 'math.divide'])('%s shows port names without numeric labels', (type) => {
    const { container } = renderCanvasNode(type)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
    expect(container.querySelector('.spn-graph-port-row small')).toBeNull()
  })

  it.each(['input.number', 'input.integer', 'input.boolean', 'input.quantity', 'input.range', 'math.add', 'math.subtract', 'math.multiply', 'math.divide'])('%s renders a shared, absolutely anchored output handle after its label', type => {
    const { container } = renderCanvasNode(type)
    const row = container.querySelector('.spn-graph-port-row.output')
    const handle = row?.querySelector('.react-flow__handle')
    expect(row).toBeInTheDocument()
    expect(handle).toHaveClass('react-flow__handle-right')
    expect(row?.lastElementChild).toBe(handle)
  })

  it('assigns all current Pier family nodes to the shared structural family theme', () => {
    const graph: SpanovaGraph = { id: 'pier', name: 'Pier', schemaVersion: 1, nodes: [{ id: 'pier', type: 'substructure.pier.circular', name: 'Pier', position: { x: 0, y: 0 }, parameters: {} }], connections: [] }
    const [node] = toReactFlowNodes(graph, { onParameterChange: vi.fn() })
    render(<ReactFlowProvider><BaseNode data={node.data} selected={false} id={node.id} type="spanova" dragging={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} isConnectable draggable deletable selectable sourcePosition={Position.Right} targetPosition={Position.Left} /></ReactFlowProvider>)
    expect(document.querySelector('.spn-graph-node')).toHaveClass('category-structural-family')
  })
})
