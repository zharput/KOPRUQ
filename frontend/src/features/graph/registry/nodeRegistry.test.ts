import { describe, expect, it } from 'vitest'
import { EN_CONCRETE_CLASS_IDS } from '../../materials/model/materialCatalog'
import { getNodeDefinition } from './nodeRegistry'

describe('Concrete material node contract', () => {
  it('uses the shared grade catalog, defaults to C40/50, and keeps a typed material output', () => {
    const concrete = getNodeDefinition('material.concrete')!
    expect(concrete.createDefaultParameters()).toEqual({ materialId: 'C40/50' })
    expect(concrete.parameterSchema[0].options?.map(option => option.value)).toEqual([...EN_CONCRETE_CLASS_IDS])
    expect(concrete.outputs[0]).toMatchObject({ id: 'material', type: 'concreteMaterial', domainType: 'ConcreteMaterial' })
  })
})

describe('Foundation graph node contracts',()=>{
  it('registers exactly two orange family generators with unit-aware shallow defaults',()=>{
    const shallow=getNodeDefinition('substructure.foundation.shallow')!,piled=getNodeDefinition('substructure.foundation.piled')!
    expect([shallow.label,piled.label]).toEqual(['Shallow Foundation','Piled Foundation'])
    expect(shallow.category).toBe('STRUCTURAL_FAMILY');expect(piled.category).toBe('STRUCTURAL_FAMILY')
    expect(shallow.createDefaultParameters({length:'mm'})).toMatchObject({LxValue:8000,LxUnit:'mm',LyValue:6000,heightValue:2000,materialId:'C40/50'})
    expect(piled.createDefaultParameters({length:'m'})).toMatchObject({pileDiameterValue:1.2,pileCountXValue:4,pileSpacingXValue:3.6,pileCountYValue:3,pileSpacingYValue:3.6,capHeightValue:2.5})
    expect(piled.inputs.map(item=>item.id)).not.toContain('Lx')
    expect(piled.outputs[0].type).toBe('foundationCandidate[]')
  })
  it('provides a generic Integer List and preserves explicit integer typing',()=>{
    const list=getNodeDefinition('input.integer-list')!
    expect(list.outputs[0].type).toBe('integer[]')
    expect(list.executor({node:{id:'i',type:list.type,name:'Integers',position:{x:0,y:0},parameters:{valuesText:'3,4,5'}},inputs:{}})).toEqual({values:[3,4,5]})
    expect(list.validateParameters({valuesText:'3,2.5'})).toContain('Values must be a comma-separated list of finite integers.')
  })
})
