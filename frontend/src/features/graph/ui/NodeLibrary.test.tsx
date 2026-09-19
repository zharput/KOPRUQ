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
})
