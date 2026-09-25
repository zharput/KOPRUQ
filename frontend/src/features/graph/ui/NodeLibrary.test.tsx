import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NodeLibrary from './NodeLibrary'

describe('Graph Node Library structural families',()=>{
  it('lists only Elastomeric Bearing under the Bearing subgroup using the shared family category',()=>{
    const onAdd=vi.fn()
    const {container}=render(<NodeLibrary onAdd={onAdd}/> )
    const subgroup=screen.getByRole('heading',{name:'Bearing'}).parentElement!
    expect(subgroup).toHaveTextContent('Elastomeric Bearing')
    expect(subgroup).not.toHaveTextContent('Pot')
    fireEvent.click(screen.getByRole('button',{name:/Elastomeric Bearing/}))
    expect(onAdd).toHaveBeenCalledWith('substructure.bearing.elastomeric')
    expect(container.querySelector('.spn-graph-library-group.category-structural-family')).toBeInTheDocument()
  })
  it('lists Abutment in the existing Pier structural subgroup and adds the registered node type', () => {
    const onAdd = vi.fn()
    const { container } = render(<NodeLibrary onAdd={onAdd} />)
    const subgroup = screen.getByRole('heading', { name: 'Abutment' }).parentElement!
    expect(subgroup).toHaveTextContent('Abutment')
    expect(screen.getByRole('heading', { name: 'Pier' }).parentElement).not.toHaveTextContent('Abutment')
    fireEvent.click(screen.getByRole('button', { name: 'Abutment' }))
    expect(onAdd).toHaveBeenCalledWith('structural.abutment')
    expect(container.querySelector('.spn-graph-library-group.category-abutment')).toBeInTheDocument()
  })

  it('lists Watch and List in the output category', () => {
    render(<NodeLibrary onAdd={vi.fn()} />)
    const output = screen.getByRole('heading', { name: 'Output' }).parentElement!
    expect(output).toHaveTextContent('Watch')
    expect(output).toHaveTextContent('List')
  })

  it('renders exact category strip colors on the category strips', () => {
    render(<NodeLibrary onAdd={vi.fn()} />)
    const strip = (name: string) => screen.getByText(name, { selector: '.spn-graph-library-category-heading span' }).parentElement!
    expect(strip('INPUT').style.backgroundColor).toBe('var(--sp-node-input)')
    expect(strip('PIER').style.backgroundColor).toBe('var(--sp-node-pier)')
    expect(strip('GIRDER').style.backgroundColor).toBe('var(--sp-node-girder)')
    expect(strip('SUPERSTRUCTURE').style.backgroundColor).toBe('var(--sp-node-superstructure)')
  })
})
