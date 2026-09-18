import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeQuantity } from '../domain/quantities'
import type { MaterialValue } from '../domain/types'
import { getNodeDefinition } from '../registry/nodeRegistry'
import NodeInspector from './NodeInspector'

describe('Concrete material Inspector', () => {
  it('shows read-only properties from the shared ConcreteMaterial value', () => {
    const material: MaterialValue = {
      domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {
        fck: makeQuantity(40, 'stress', 'MPa'),
        unitWeight: makeQuantity(25, 'unitWeight', 'kN/m3'),
      },
    }
    render(<NodeInspector
      node={{ id: 'c', type: 'material.concrete', name: 'Concrete', position: { x: 0, y: 0 }, parameters: { materialId: 'C40/50' } }}
      states={{}} errors={{}} outputs={{}} concreteMaterial={material}
      onNodeChange={vi.fn()} onParameterChange={vi.fn()}
    />)
    expect(screen.getByText('C40/50')).toBeInTheDocument()
    expect(screen.getByText('40.00 MPa')).toBeInTheDocument()
    expect(screen.getByText('25.00 kN/m³')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows list source metadata and the complete resolved design-value details', () => {
    const pierType='substructure.pier.rectangular',pier={id:'p',type:pierType,name:'Pier',position:{x:0,y:0},parameters:getNodeDefinition(pierType)!.createDefaultParameters({length:'m'})}
    render(<NodeInspector node={pier} states={{}} errors={{}} outputs={{}} resolvedInputs={{p:{width:[makeQuantity(2,'length','m'),makeQuantity(2.5,'length','m'),makeQuantity(3,'length','m')]}}} nodes={[pier,{id:'r',type:'input.range',name:'Range 1',position:{x:0,y:0},parameters:{}}]} connections={[{id:'e',sourceNodeId:'r',sourcePortId:'values',targetNodeId:'p',targetPortId:'width'}]} onNodeChange={vi.fn()} onParameterChange={vi.fn()} />)
    expect(screen.getByText(/Source: Range 1.Values/)).toBeInTheDocument()
    expect(screen.getByText(/Resolved list details/)).toHaveTextContent('3 values')
    expect(screen.getByText('Quantity List')).toBeInTheDocument()
    expect(screen.getByText('[2.00, 2.50, 3.00] m')).toBeInTheDocument()
  })
})

describe('Pier Cap Inspector',()=>{
 it('shows live cap inputs, candidate statistics, selected material and an illustrative schematic',()=>{
  const type='substructure.pier-cap.t',node={id:'cap',type,name:'T-Cap',position:{x:0,y:0},parameters:getNodeDefinition(type)!.createDefaultParameters({length:'m'})}
  const range={id:'r',type:'input.range',name:'Stem range',position:{x:0,y:0},parameters:{}}
  render(<NodeInspector node={node} states={{}} errors={{}} outputs={{}} previewInputs={{stemWidth:{sourceName:'Stem range.Values',value:[{value:1.5,quantityKind:'length',unit:'m'},{value:3.5,quantityKind:'length',unit:'m'}]}}} nodes={[node,range]} connections={[{id:'stem',sourceNodeId:'r',sourcePortId:'values',targetNodeId:'cap',targetPortId:'stemWidth'}]} onNodeChange={vi.fn()} onParameterChange={vi.fn()} />)
  expect(screen.getByText('T-Cap')).toBeInTheDocument()
  expect(screen.getByText('Raw combinations')).toBeInTheDocument()
  expect(screen.getByText('Raw combinations').parentElement).toHaveTextContent('2')
  expect(screen.getByText('Invalid combinations').parentElement).toHaveTextContent('1')
  expect(screen.getByText('INVALID COMBINATIONS FILTERED')).toBeInTheDocument()
  expect(screen.getByRole('img',{name:'Illustrative T-Cap cross section'})).toBeInTheDocument()
  expect(screen.getByText(/Source: Stem range.Values/)).toBeInTheDocument()
 })
})

describe('Foundation Inspector',()=>{
 it('shows piled resolved design inputs, candidate counts, derived geometry and a bounded schematic',()=>{
  const type='substructure.foundation.piled',node={id:'foundation',type,name:'Piled Foundation',position:{x:0,y:0},parameters:getNodeDefinition(type)!.createDefaultParameters({length:'m'})}
  render(<NodeInspector node={node} states={{}} errors={{}} outputs={{}} onNodeChange={vi.fn()} onParameterChange={vi.fn()}/> )
  expect(screen.getByText('Foundation Type').nextElementSibling).toHaveTextContent('Piled')
  expect(screen.getByText('Derived Lx').nextElementSibling).toHaveTextContent('13.20 m')
  expect(screen.getByText('Derived Ly').nextElementSibling).toHaveTextContent('9.60 m')
  expect(screen.getByText('Raw combinations').nextElementSibling).toHaveTextContent('1')
  expect(screen.getByRole('img',{name:/Piled Foundation plan 4 by 3/})).toBeInTheDocument()
  expect(screen.getByLabelText('Pile Diameter D local default')).toBeInTheDocument()
  expect(screen.queryByText(/Pile Length/)).not.toBeInTheDocument()
 })
})
