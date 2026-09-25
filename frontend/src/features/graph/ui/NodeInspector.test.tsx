import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeQuantity } from '../domain/quantities'
import type { KopruqNode } from '../domain/types'
import { getNodeDefinition, getNodeDefinitions } from '../registry/nodeRegistry'
import NodeInspector from './NodeInspector'

const handlers = { onNodeChange: vi.fn(), onParameterChange: vi.fn() }
function node(type: string, id = 'internal-uuid-7f91'): KopruqNode { return { id, type, name: getNodeDefinition(type)!.label, position: { x: 0, y: 0 }, parameters: getNodeDefinition(type)!.createDefaultParameters({ length: 'm' }) } }

describe('Node Inspector', () => {
  it('converts a local numeric value when its unit selector changes', () => {
    const value = node('substructure.bearing.elastomeric')
    const onParameterChange = vi.fn()
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} onNodeChange={vi.fn()} onParameterChange={onParameterChange} />)
    expect(screen.queryByLabelText('Length X unit')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Length X')).toHaveValue('0.6')
  })
  it.each(getNodeDefinitions().map(definition => [definition.type, definition.label]))('keeps implementation ports and IDs out of %s Inspector', (type, label) => {
    const value=node(type)
    const { container }=render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\b(PORTS|INPUTS|OUTPUTS)\b|numeric\[\]|display:any|candidate\[\]|concreteMaterial|node-\w{8}-/i)
    expect(container.textContent).not.toContain(value.id)
    expect(container.textContent).not.toContain(value.type)
  })

  it('uses a rounded obround for Oval Pier with resolved B and D and reference axes', () => {
    const value=node('substructure.pier.oval')
    const { container }=render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/oval pier schematic/i})
    expect(svg.querySelector('ellipse')).toBeNull()
    expect(svg.querySelector('rect[rx]')).toBeInTheDocument()
    expect(svg.getAttribute('aria-label')).not.toContain('Bridge Axis')
    expect(container.textContent).toContain('B = 3.00 m')
    expect(container.textContent).toContain('D = 1.50 m')
    expect(container.textContent).toContain('X-X')
    expect(container.textContent).toContain('Y-Y')
  })

  it('shows H-section dimensions with B transverse and D longitudinal', () => {
    const value=node('substructure.pier.h_section')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/h section pier schematic/i})
    expect(svg.querySelector('[data-orientation="rotated-90"]')).toBeInTheDocument()
    expect(svg.textContent).toContain('B = 3.00 m')
    expect(svg.textContent).toContain('D = 6.00 m')
    expect(svg.textContent).toContain('tw = 3.00 m')
    expect(svg.textContent).toContain('tf = 0.75 m')
  })

  it('draws T-Cap flange at the bottom with its stem extending upward', () => {
    const value=node('substructure.pier-cap.t')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/t-cap with bottom flange/i}), path=svg.querySelector('path')!
    expect(path.getAttribute('data-flange-position')).toBe('bottom')
    expect(path.getAttribute('d')).toMatch(/^M[^ ]+ [^ ]+ H[^ ]+ V[^ ]+ H[^ ]+ V[^ ]+ H[^ ]+ V[^ ]+ H/)
    for(const text of ['Length = 12.00 m','Top / Flange Width = 3.00 m','Stem = 1.50 m','H = 2.50 m','tf = 0.80 m','Bridge Axis']) expect(svg.textContent).toContain(text)
  })

  it('shows shallow foundation PLAN and SECTION with Lx, Ly, H and axis', () => {
    const value=node('substructure.foundation.shallow')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/shallow foundation plan and section/i})
    expect(within(svg).getByText('PLAN')).toBeInTheDocument()
    expect(within(svg).getByText('SECTION')).toBeInTheDocument()
    expect(svg.querySelectorAll('.engineering-outline')).toHaveLength(2)
    expect(svg.textContent).toContain('Lx = 8.00 m')
    expect(svg.textContent).toContain('Ly=6.00m')
    expect(svg.textContent).toContain('H=2.00m')
    expect(svg.textContent).toContain('Bridge Axis')
    expect(svg.textContent).not.toContain('FOOTING')
  })

  it('shows piled foundation pile grid in PLAN and cap/piles in SECTION using derived geometry', () => {
    const value=node('substructure.foundation.piled')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/piled foundation plan and section/i})
    expect(within(svg).getByText('PLAN')).toBeInTheDocument()
    expect(within(svg).getByText('SECTION')).toBeInTheDocument()
    expect(svg.querySelectorAll('.engineering-pile').length).toBe(12)
    for(const text of ['Lx = 13.20 m','Ly=9.60m','Nx = 4','Ny = 3','ax = 3.60 m','ay = 3.60 m','D = 1.20 m','H = 2.50 m','Bridge Axis']) expect(svg.textContent).toContain(text)
  })

  it('converts schematic values to Project display units and indicates connected ranges', () => {
    const pier=node('substructure.pier.rectangular')
    const { container, rerender }=render(<NodeInspector node={pier} states={{}} errors={{}} outputs={{}} projectUnits={{length:'mm'}} {...handlers} />)
    expect(screen.getByRole('img',{name:/rectangular pier schematic/i}).textContent).toContain('B = 3000.00 mm')
    rerender(<NodeInspector node={pier} states={{}} errors={{}} outputs={{}} previewInputs={{width:{sourceName:'Hidden source',value:[makeQuantity(2,'length','m'),makeQuantity(2.5,'length','m')]}}} connections={[{id:'private-edge-id',sourceNodeId:'private-source-id',sourcePortId:'values',targetNodeId:pier.id,targetPortId:'width'}]} projectUnits={{length:'m'}} {...handlers} />)
    const svg=screen.getByRole('img',{name:/rectangular pier schematic/i})
    expect(container.textContent).toContain('2.00 m')
    expect(svg.getAttribute('aria-label')).toContain('B/D 2.00 × 1.50 m')
    expect(svg.textContent).toContain('X-X')
    expect(svg.textContent).toContain('Y-Y')
    expect(svg.textContent).not.toMatch(/Hidden source|private-source-id|private-edge-id/)
  })

  it('updates the schematic from changed local parameters without waiting for Run', () => {
    const pier=node('substructure.pier.rectangular')
    const { rerender }=render(<NodeInspector node={pier} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(screen.getByRole('img',{name:/rectangular pier schematic/i}).textContent).toContain('B = 3.00 m')
    const updated={...pier,parameters:{...pier.parameters,BValue:4}}
    rerender(<NodeInspector node={updated} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(screen.getByRole('img',{name:/rectangular pier schematic/i}).textContent).toContain('B = 4.00 m')
  })

  it('shows a concise concrete material result without exposing internal catalog IDs', () => {
    const concrete=node('material.concrete')
    render(<NodeInspector node={concrete} states={{}} errors={{}} outputs={{ concrete:{material:{domainType:'ConcreteMaterial',id:'C40/50',name:'C40/50',properties:{}}} }} {...handlers} />)
    expect(screen.getAllByText('C40/50').length).toBeGreaterThan(1)
    expect(screen.queryByText(/concreteMaterial|source UUID|node ID/i)).not.toBeInTheDocument()
  })

  it('shows concise multi-selection counts and a minimal empty state', () => {
    const selected=[node('substructure.pier.rectangular','a'),node('substructure.pier.rectangular','b'),node('substructure.pier-cap.t','c')]
    const {rerender}=render(<NodeInspector selectedNodes={selected} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(screen.getByText('MULTIPLE SELECTION')).toBeInTheDocument()
    expect(screen.getByText('Selected Nodes').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Rectangular Pier').nextElementSibling).toHaveTextContent('2')
    rerender(<NodeInspector states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(screen.getByText('Select a node to inspect its properties.')).toBeInTheDocument()
  })
})
