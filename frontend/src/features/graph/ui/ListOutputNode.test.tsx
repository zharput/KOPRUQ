import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it, vi } from 'vitest'
import ListOutputNode from './ListOutputNode'
import type { GraphNodeViewData } from '../adapters/reactFlowAdapter'
import type { PierCandidate, PierCapCandidate, FoundationCandidate, BearingCandidate } from '../domain/types'

const data = (value: GraphNodeViewData['output'], projectUnits?: GraphNodeViewData['projectUnits'], extra: Partial<GraphNodeViewData> = {}): GraphNodeViewData => ({
  node: { id: 'list', type: 'output.list', name: 'List', position: { x: 0, y: 0 }, parameters: {} },
  executionState: 'success', output: value, outputs: value === undefined ? undefined : { value }, projectUnits, onParameterChange: vi.fn(), ...extra,
})

describe('List output node', () => {
  it('renders the full Elastomeric Bearing candidate geometry and distinct stiffness units',async()=>{
    const bearing:BearingCandidate={id:'bearing-1',bearingType:'ELASTOMERIC',geometry:{lengthX:.6,widthY:.7,totalHeight:.15},stiffness:{kx:3000,ky:30000,kz:100000,krx:100000,kry:100000,krz:100000}}
    render(<ReactFlowProvider><ListOutputNode data={data([bearing],{length:'mm'})} selected={false}/></ReactFlowProvider>)
    expect(screen.getByRole('listitem').textContent).toContain('Lx=600.00 mm')
    expect(screen.getByRole('listitem').textContent).toContain('Kx=3000 kN/m')
    await userEvent.click(screen.getByRole('button',{name:'Expand item 0'}))
    expect(screen.getByText('Length X').nextElementSibling).toHaveTextContent('600.00 mm')
    expect(screen.getByText('Krx').nextElementSibling).toHaveTextContent('100000 kN·m/rad')
  })
  it('renders shallow and piled foundation candidates with source candidate-derived Lx/Ly',()=>{
    const shallow:FoundationCandidate={id:'s',foundationType:'SHALLOW',geometry:{Lx:8,Ly:6,height:2},material:{domainType:'ConcreteMaterial',id:'C35/45',name:'C35/45',properties:{}}}
    const piled:FoundationCandidate={id:'p',foundationType:'PILED',geometry:{pileDiameter:1.2,pileCountX:4,pileSpacingX:3.6,pileCountY:3,pileSpacingY:3.6,capHeight:2.5,derived:{Lx:13.2,Ly:9.6}},material:shallow.material}
    const {rerender}=render(<ReactFlowProvider><ListOutputNode data={data([shallow])} selected={false}/></ReactFlowProvider>);expect(screen.getByText(/Shallow Foundation.*Lx=8.00 m.*Ly=6.00 m.*H=2.00 m.*C35\/45/)).toBeInTheDocument()
    rerender(<ReactFlowProvider><ListOutputNode data={data([piled])} selected={false}/></ReactFlowProvider>);expect(screen.getByText(/Piled Foundation.*D=1.20 m.*nx=4.*Lx=13.20 m.*Ly=9.60 m.*C35\/45/)).toBeInTheDocument()
  })
  it('renders indexed primitive and Quantity values using project units', () => {
    const primitive = render(<ReactFlowProvider><ListOutputNode data={data([2, 2.5, 3])} selected={false} /></ReactFlowProvider>)
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('2.5')).toBeInTheDocument()
    primitive.unmount()
    render(<ReactFlowProvider><ListOutputNode data={data([{ value: 2, quantityKind: 'length', unit: 'm' }, { value: 2.5, quantityKind: 'length', unit: 'm' }], { length: 'mm' })} selected={false} /></ReactFlowProvider>)
    expect(screen.getByText('2000.00 mm')).toBeInTheDocument()
    expect(screen.getByText('2500.00 mm')).toBeInTheDocument()
  })

  it('expands a PierCandidate into generic labeled engineering fields', async () => {
    const user = userEvent.setup()
    const candidate: PierCandidate = { id: 'pier-1', pierType: 'RECTANGULAR', geometry: { B: 3, D: 4 }, heightM: 10, columnCount: 1, material: { domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {} } }
    render(<ReactFlowProvider><ListOutputNode data={data([candidate], { length: 'm' })} selected={false} /></ReactFlowProvider>)
    const rows = screen.getByRole('list')
    expect(within(rows).getByText(/Rectangular Pier.*B=3.00 m.*D=4.00 m.*H=10.00 m/)).toBeInTheDocument()
    expect(within(rows).getByText(/Material C40\/50.*Columns 1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand item 0' })).toHaveTextContent('Details')
    expect(rows.textContent).not.toContain(String.fromCharCode(0x00c3, 0x00a2))
    expect(rows.textContent).not.toContain(String.fromCharCode(0x00c3, 0x0192))
    await user.click(screen.getByRole('button', { name: 'Expand item 0' }))
    expect(screen.getByRole('button', { name: 'Collapse item 0' })).toHaveTextContent('Hide')
    expect(within(rows).getByText('C40/50')).toBeInTheDocument()
    expect(within(rows).getByText('Columns')).toBeInTheDocument()
    expect(within(rows).getByText('10.00 m')).toBeInTheDocument()
  })

  it('renders compact Rectangular and T-Cap candidate rows and details',async()=>{
    const user=userEvent.setup(),material={domainType:'ConcreteMaterial' as const,id:'C40/50',name:'C40/50',properties:{}}
    const candidates:PierCapCandidate[]=[
      {id:'rc-1',capType:'RECTANGULAR',geometry:{length:12,width:3,height:2},material},
      {id:'tc-1',capType:'T',geometry:{length:12,topWidth:3,stemWidth:1.5,totalHeight:2.5,flangeThickness:.8},material},
    ]
    render(<ReactFlowProvider><ListOutputNode data={data(candidates,{length:'m'})} selected={false}/></ReactFlowProvider>)
    const rows=screen.getByRole('list')
    expect(within(rows).getByText(/Rectangular Cap.*L=12.00 m.*W=3.00 m.*H=2.00 m.*Material C40\/50/)).toBeInTheDocument()
    expect(within(rows).getByText(/T-Cap.*Top W=3.00 m.*Stem W=1.50 m.*tf=0.80 m/)).toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Expand item 1'}))
    expect(within(rows).getByText('Flange Thickness')).toBeInTheDocument()
    expect(within(rows).getByText('2.50 m')).toBeInTheDocument()
  })

  it('renders only one bounded page from large collections', () => {
    render(<ReactFlowProvider><ListOutputNode data={data(Array.from({ length: 1000 }, (_, index) => index))} selected={false} /></ReactFlowProvider>)
    expect(screen.getByRole('list').querySelectorAll('[role="listitem"]')).toHaveLength(50)
    expect(screen.getByText('1 / 20')).toBeInTheDocument()
  })

  it('shows Run required for a connected execution output before Run', () => {
    render(<ReactFlowProvider><ListOutputNode data={data(undefined, undefined, { outputAvailability: 'run-required' })} selected={false} /></ReactFlowProvider>)
    expect(screen.getByText('Run required')).toBeInTheDocument()
    expect(screen.queryByText('No items')).not.toBeInTheDocument()
  })

  it('hides old execution items and marks them outdated after an upstream change', () => {
    render(<ReactFlowProvider><ListOutputNode data={data([1, 2, 3], undefined, { isDirty: true, outputAvailability: 'dirty' })} selected={false} /></ReactFlowProvider>)
    expect(screen.getByText('Results outdated - Run required')).toBeInTheDocument()
    expect(within(screen.getByRole('list')).queryByRole('listitem')).not.toBeInTheDocument()
  })
})
