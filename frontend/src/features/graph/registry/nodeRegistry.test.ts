import { describe, expect, it } from 'vitest'
import { EN_CONCRETE_CLASS_IDS } from '../../materials/model/materialCatalog'
import { createNode, getNodeDefinition, previewDesignOutput } from './nodeRegistry'

describe('Central node creation contract', () => {
  it('creates persisted UI nodes from the registered definition', () => {
    const definition = getNodeDefinition('input.number')!
    const node = createNode(definition, { id: 'number-1', name: 'Number-1', position: { x: 12, y: 24 } })
    expect(node).toMatchObject({ id: 'number-1', type: 'input.number', name: 'Number-1', position: { x: 12, y: 24 } })
    expect(node.parameters).toEqual(definition.createDefaultParameters())
  })
})

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

describe('Precast girder live preview contract', () => {
  it.each([
    ['m', 1.9, 1.5, 0.2],
    ['cm', 190, 150, 20],
    ['mm', 1900, 1500, 200],
  ] as const)('creates precast defaults in the selected length unit (%s)', (unit, height, flange, web) => {
    const definition = getNodeDefinition('structural.girder.precast')!
    expect(definition.createDefaultParameters({ length: unit })).toMatchObject({ HValue: height, HUnit: unit, tfValue: flange, tfUnit: unit, wValue: web, wUnit: unit })
  })

  it('generates the default geometric candidate before RUN with the full section geometry', () => {
    const definition = getNodeDefinition('structural.girder.precast')!
    const node = { id: 'g', type: definition.type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }
    const preview = previewDesignOutput(node, 'candidates', {}) as unknown[]
    expect(preview).toHaveLength(1)
    expect(preview[0]).toMatchObject({ geometry: { H: 1.9, tf: 1.5, bf: 0.8, w: 0.2, th1: 0.12, th2: 0.1, bh1: 0.28, bh2: 0.15 }, material: { id: 'C40/50' } })
  })
})

describe('Steel girder unit-aware defaults', () => {
  it.each([
    ['m', 2.5, 0.04, 0.02],
    ['cm', 250, 4, 2],
    ['mm', 2500, 40, 20],
  ] as const)('creates steel defaults in the selected length unit (%s)', (unit, height, flangeThickness, webThickness) => {
    const definition = getNodeDefinition('structural.girder.steel')!
    expect(definition.createDefaultParameters({ length: unit })).toMatchObject({ HValue: height, HUnit: unit, ttfValue: flangeThickness, ttfUnit: unit, twValue: webThickness, twUnit: unit })
  })

  it('keeps default physical geometry invariant across units during preview', () => {
    const definition = getNodeDefinition('structural.girder.steel')!
    const metre = { id: 'm', type: definition.type, name: definition.label, position: { x: 0, y: 0 }, parameters: definition.createDefaultParameters({ length: 'm' }) }
    const millimetre = { ...metre, id: 'mm', parameters: definition.createDefaultParameters({ length: 'mm' }) }
    const mCandidate = (previewDesignOutput(metre, 'candidates', {}) as any[])[0]
    const mmCandidate = (previewDesignOutput(millimetre, 'candidates', {}) as any[])[0]
    expect(mmCandidate.geometry).toEqual(mCandidate.geometry)
  })
})

describe('Engineering Inspector metadata',()=>{
  it.each([
    ['substructure.pier.circular','pier',['diameter','height','material','columns']],
    ['substructure.pier.rectangular','pier',['width','depth','height','material','columns']],
    ['substructure.pier.oval','pier',['width','depth','height','material','columns']],
    ['substructure.pier.box','pier',['outerWidth','outerDepth','wallThickness','height','material','columns']],
    ['substructure.pier.h_section','pier',['width','depth','webThickness','flangeThickness','height','material','columns']],
    ['substructure.pier-cap.t','pier-cap',['length','topWidth','stemWidth','totalHeight','flangeThickness','material']],
    ['substructure.pier-cap.rectangular','pier-cap',['length','width','height','material']],
    ['substructure.foundation.shallow','foundation',['Lx','Ly','height','material']],
    ['substructure.foundation.piled','foundation',['pileDiameter','pileCountX','pileSpacingX','pileCountY','pileSpacingY','capHeight','material']],
    ['substructure.bearing.elastomeric','bearing',['lengthX','widthY','totalHeight','kx','ky','kz','krx','kry','krz']],
  ])('declares shared Inspector presentation for %s', (type, schematic, order) => {
    const definition=getNodeDefinition(type)!
    expect(definition.engineeringInspector).toEqual({schematic,parameterOrder:order})
    expect(order.every(id=>definition.inputs.some(input=>input.id===id))).toBe(true)
  })
})

describe('Elastomeric Bearing graph node contract',()=>{
  it('uses shared unit-aware geometry and distinct stiffness quantities with live family outputs',async()=>{
    const bearing=getNodeDefinition('substructure.bearing.elastomeric')!
    expect(bearing.category).toBe('STRUCTURAL_FAMILY')
    expect(bearing.createDefaultParameters({length:'mm'})).toMatchObject({lengthXValue:600,lengthXUnit:'mm',widthYValue:700,totalHeightValue:150,kxValue:3000,kxUnit:'kN/m',krxValue:100000,krxUnit:'kNm/rad'})
    expect(bearing.inputs.map(item=>[item.id,item.quantityKind])).toEqual([['lengthX','length'],['widthY','length'],['totalHeight','length'],['kx','translationalStiffness'],['ky','translationalStiffness'],['kz','translationalStiffness'],['krx','rotationalStiffness'],['kry','rotationalStiffness'],['krz','rotationalStiffness']])
    expect(bearing.outputs[0].type).toBe('bearingCandidate[]')
    expect(bearing.validateParameters(bearing.createDefaultParameters())).toEqual([])
    expect(bearing.validateParameters({...bearing.createDefaultParameters(),kxValue:Number.NaN})).toContain('kxValue must be a valid number.')
    const generated=await bearing.executor({node:{id:'b',type:bearing.type,name:bearing.label,position:{x:0,y:0},parameters:bearing.createDefaultParameters()},inputs:{kx:0}})
    expect(generated.candidates).toMatchObject([{bearingType:'ELASTOMERIC',stiffness:{kx:0}}])
    expect(generated.generatedCombinations).toBe(1)
  })
})
