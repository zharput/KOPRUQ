import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NodeLibrary from './NodeLibrary'
import { NODE_GROUP_THEME } from '../domain/nodeVisualThemes'

describe('Graph Node Library structural families',()=>{
  it('lists only Elastomeric Bearing under the Bearing subgroup using the shared family category',()=>{
    const onAdd=vi.fn()
    render(<NodeLibrary onAdd={onAdd}/> )
    const group=screen.getByRole('button',{name:'STRUCTURAL'}).closest('section')!
    expect(group).toHaveTextContent('Elastomeric Bearing')
    expect(group).not.toHaveTextContent('Pot')
    fireEvent.click(screen.getByRole('button',{name:/Elastomeric Bearing/}))
    expect(onAdd).toHaveBeenCalledWith('substructure.bearing.elastomeric')
    expect(group).toHaveClass('library-family-structural')
  })
  it('lists Abutment in the existing Pier structural subgroup and adds the registered node type', () => {
    const onAdd = vi.fn()
    render(<NodeLibrary onAdd={onAdd} />)
    const group = screen.getByRole('button', { name: 'STRUCTURAL' }).closest('section')!
    expect(group).toHaveTextContent('Abutment')
    fireEvent.click(screen.getByRole('button', { name: 'Abutment' }))
    expect(onAdd).toHaveBeenCalledWith('structural.abutment')
    expect(group).toHaveClass('library-family-structural')
  })

  it('lists Watch and List in the output category', () => {
    render(<NodeLibrary onAdd={vi.fn()} />)
    const output = screen.getByRole('button', { name: 'OUTPUT' }).closest('section')!
    expect(output).toHaveTextContent('Watch')
    expect(output).toHaveTextContent('List')
  })

  it('renders exact category strip colors on the category strips', () => {
    render(<NodeLibrary onAdd={vi.fn()} />)
    const strip = (name: string) => screen.getByRole('button', { name }).closest('section')!.querySelector<HTMLButtonElement>('.spn-graph-library-category-heading')!
    expect(strip('INPUT').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.INPUT.dark)
    expect(strip('OUTPUT').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.OUTPUT.dark)
    expect(strip('MATH').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.MATH.dark)
    expect(strip('MATERIALS').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.MATERIALS.dark)
    expect(strip('STRUCTURAL').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.STRUCTURAL.dark)
    expect(strip('SUPERSTRUCTURE FAMILY').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.SUPERSTRUCTURE.dark)
    expect(strip('BRIDGE FAMILY').style.getPropertyValue('--node-group-color')).toBe(NODE_GROUP_THEME.BRIDGE.dark)
    expect(strip('INPUT')).toHaveStyle({ backgroundColor: NODE_GROUP_THEME.INPUT.dark })
    expect(strip('INPUT')).toHaveAttribute('data-node-group', 'input')
    expect(strip('SUPERSTRUCTURE FAMILY')).toHaveAttribute('data-node-group', 'superstructure-family')
    expect(strip('BRIDGE FAMILY')).toHaveAttribute('data-node-group', 'bridge-family')
  })
})
