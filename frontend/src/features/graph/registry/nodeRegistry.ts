import type { GraphParameterValue, GraphPortType, GraphValue, MaterialValue, SpanovaNode } from '../domain/types'
import { makeQuantity, quantityFromCanonical, QUANTITY_KINDS as UNIT_KINDS, type QuantityKind, type UnitId, unitsForKind } from '../domain/quantities'
import { EN_CONCRETE_CLASS_IDS } from '../../materials/model/materialCatalog'
import { generatePierCandidatesWithStats, localLength, normalizeCandidateInput } from '../domain/pierCandidates'
import { generatePierCapCandidatesWithStats } from '../domain/pierCapCandidates'
import { generatePiledFoundationCandidates, generateShallowFoundationCandidates } from '../domain/foundationCandidates'
import type { NodeCategory } from '../domain/nodeVisualThemes'

export type { NodeCategory } from '../domain/nodeVisualThemes'
export type ParameterDescriptor = { key: string; label: string; dataType: 'number' | 'integer' | 'boolean' | 'string' | 'select'; min?: number; step?: number; options?: readonly { value: string; label: string }[]; inputPortId?: string }
export type NodePortDefinition = { id: string; label: string; type: GraphPortType; quantityKind?: QuantityKind; domainType?: MaterialValue['domainType']; required?: boolean; description?: string }
export interface GraphExecutionServices { resolveConcreteMaterial?: (materialId:string)=>Promise<MaterialValue>; projectUnits?: Partial<Record<QuantityKind, string>> }
export type NodeExecutionContext = { node: SpanovaNode; inputs: Record<string, GraphValue>; services?: GraphExecutionServices }
export interface NodeDefinition { type: string; label: string; category: NodeCategory; description: string; inputs: NodePortDefinition[]; outputs: NodePortDefinition[]; parameterSchema: ParameterDescriptor[]; createDefaultParameters: (projectUnits?: Record<string,string>) => Record<string,GraphParameterValue>; validateParameters: (parameters: Record<string,GraphParameterValue>) => string[]; executor: (context:NodeExecutionContext)=>Record<string,GraphValue>|Promise<Record<string,GraphValue>> }
const classOptions=EN_CONCRETE_CLASS_IDS.map(value=>({value,label:value}))
const lengthOptions = unitsForKind('length').map(unit => ({ value: unit.id, label: unit.label }))
const pierDefinitions = [
  pierNode('CIRCULAR', 'Circular Pier', [{ key: 'D', label: 'Diameter', port: 'diameter', defaultValue: 2 }]),
  pierNode('RECTANGULAR', 'Rectangular Pier', [{ key: 'B', label: 'B - Transverse', port: 'width', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'depth', defaultValue: 1.5 }]),
  pierNode('OVAL', 'Oval Pier', [{ key: 'B', label: 'B - Transverse', port: 'width', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'depth', defaultValue: 1.5 }]),
  pierNode('BOX', 'Box Pier', [{ key: 'B', label: 'B - Transverse', port: 'outerWidth', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'outerDepth', defaultValue: 1.5 }, { key: 'tw', label: 'Wall thickness', port: 'wallThickness', defaultValue: .3 }]),
  pierNode('H_SECTION', 'H Pier', [{ key: 'B', label: 'Overall Width', port: 'width', defaultValue: 3 }, { key: 'D', label: 'Overall Depth', port: 'depth', defaultValue: 1.5 }, { key: 'tw', label: 'Web Thickness', port: 'webThickness', defaultValue: .2 }, { key: 'tf', label: 'Flange Thickness', port: 'flangeThickness', defaultValue: .2 }]),
]
const pierCapDefinitions = [
  pierCapNode('RECTANGULAR', 'Rectangular Cap', [
    { key: 'length', label: 'Length', defaultValue: 12 }, { key: 'width', label: 'Width', defaultValue: 3 }, { key: 'height', label: 'Height', defaultValue: 2 },
  ]),
  pierCapNode('T', 'T-Cap', [
    { key: 'length', label: 'Length', defaultValue: 12 }, { key: 'topWidth', label: 'Top Width', defaultValue: 3 }, { key: 'stemWidth', label: 'Stem Width', defaultValue: 1.5 }, { key: 'totalHeight', label: 'Total Height', defaultValue: 2.5 }, { key: 'flangeThickness', label: 'Flange Thickness', defaultValue: .8 },
  ]),
]
const foundationDefinitions = [shallowFoundationNode(), piledFoundationNode()]
function pierNode(pierType: import('../domain/types').PierCandidate['pierType'], label: string, dimensions: { key: string; label: string; port: string; defaultValue: number }[]): NodeDefinition {
  const inputs: NodePortDefinition[] = [...dimensions.map(item => ({ id: item.port, label: item.label, type: 'length[]' as const })), { id: 'height', label: 'Height', type: 'length[]' }, { id: 'material', label: 'Material', type: 'concreteMaterial', domainType: 'ConcreteMaterial' }, { id: 'columns', label: 'Columns', type: 'integer', description: 'Number of physical columns forming the pier at this support axis. Supported values: 1 or 2.' }]
  const parameterSchema: ParameterDescriptor[] = [...dimensions.flatMap(item => [{ key: `${item.key}Value`, label: `${item.label} local default`, dataType: 'number' as const, min: 0, step: .01, inputPortId: item.port }, { key: `${item.key}Unit`, label: `${item.label} unit`, dataType: 'select' as const, options: lengthOptions, inputPortId: item.port }]), { key: 'heightValue', label: 'Height local default', dataType: 'number', min: 0, step: .01, inputPortId: 'height' }, { key: 'heightUnit', label: 'Height unit', dataType: 'select', options: lengthOptions, inputPortId: 'height' }, { key: 'materialId', label: 'Material local default', dataType: 'select', options: classOptions, inputPortId: 'material' }, { key: 'columns', label: 'Columns local default', dataType: 'integer', min: 1, step: 1, inputPortId: 'columns' }]
  return {
    type: `substructure.pier.${pierType.toLowerCase()}`, label, category: 'STRUCTURAL_FAMILY', description: `Generate deterministic ${label} geometry candidates from local values and connected design ranges.`, inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'pierCandidate[]' }], parameterSchema,
    createDefaultParameters: projectUnits => { const unit = defaultUnit('length', projectUnits); return Object.fromEntries([...dimensions.flatMap(item => [[`${item.key}Value`, quantityFromCanonical(item.defaultValue, 'length', unit)], [`${item.key}Unit`, unit]]), ['heightValue', quantityFromCanonical(10, 'length', unit)], ['heightUnit', unit], ['materialId', classOptions.find(item => item.value === 'C40/50')?.value ?? classOptions[0]?.value ?? ''], ['columns', 1]]) },
    validateParameters: p => [...dimensions.flatMap(item => [...numberParameter(p, `${item.key}Value`), ...(typeof p[`${item.key}Unit`] === 'string' && lengthOptions.some(unit => unit.value === p[`${item.key}Unit`]) ? [] : [`${item.label} requires a valid Length unit.`])]), ...numberParameter(p, 'heightValue'), ...(typeof p.heightValue === 'number' && p.heightValue <= 0 ? ['Height local default must be greater than zero.'] : []), ...(typeof p.heightUnit === 'string' && lengthOptions.some(unit => unit.value === p.heightUnit) ? [] : ['Height requires a valid Length unit.']), ...(typeof p.columns === 'number' && Number.isInteger(p.columns) && p.columns >= 1 && p.columns <= 2 ? [] : ['Column Count must be 1 or 2.']), ...(typeof p.materialId === 'string' && classOptions.some(item => item.value === p.materialId) ? [] : ['Select a supported ConcreteMaterial.'])],
    executor: async ({ node, inputs, services }) => {
      const geometry: Record<string, import('../domain/pierCandidates').LengthInput> = {}
      for (const item of dimensions) geometry[item.key] = (inputs[item.port] ?? localLength(node.parameters[`${item.key}Value`] as number, node.parameters[`${item.key}Unit`] as string)) as import('../domain/pierCandidates').LengthInput
      const height = (inputs.height ?? localLength(node.parameters.heightValue as number, node.parameters.heightUnit as string)) as import('../domain/pierCandidates').LengthInput
      const materialId = (inputs.material ?? node.parameters.materialId) as string | MaterialValue
      const material = typeof materialId === 'string' ? services?.resolveConcreteMaterial ? await services.resolveConcreteMaterial(materialId) : { domainType: 'ConcreteMaterial' as const, id: materialId, name: materialId, properties: {} } : materialId
      const columns = (inputs.columns ?? node.parameters.columns) as number
      const generated = generatePierCandidatesWithStats({ pierType, geometry, height, columnCount: columns, material })
      return { candidates: generated.candidates as GraphValue, generatedCombinations: generated.generatedCombinations, invalidCombinations: generated.invalidCombinations }
    },
  }
}
function pierCapNode(capType: import('../domain/pierCapCandidates').PierCapType, label: string, dimensions: { key: string; label: string; defaultValue: number }[]): NodeDefinition {
  const inputs: NodePortDefinition[] = [...dimensions.map(item => ({ id: item.key, label: item.label, type: 'length[]' as const, quantityKind: 'length' as const })), { id: 'material', label: 'Material', type: 'concreteMaterial', domainType: 'ConcreteMaterial' }]
  const parameterSchema: ParameterDescriptor[] = [...dimensions.flatMap(item => [{ key: `${item.key}Value`, label: `${item.label} local default`, dataType: 'number' as const, min: 0, step: .01, inputPortId: item.key }, { key: `${item.key}Unit`, label: `${item.label} unit`, dataType: 'select' as const, options: lengthOptions, inputPortId: item.key }]), { key: 'materialId', label: 'Material local default', dataType: 'select', options: classOptions, inputPortId: 'material' }]
  return {
    type: `substructure.pier-cap.${capType.toLowerCase()}`, label, category: 'STRUCTURAL_FAMILY', description: `Generate deterministic ${label} family candidates from local values and connected design ranges.`, inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'pierCapCandidate[]' }], parameterSchema,
    createDefaultParameters: projectUnits => { const unit = defaultUnit('length', projectUnits); return Object.fromEntries([...dimensions.flatMap(item => [[`${item.key}Value`, quantityFromCanonical(item.defaultValue, 'length', unit)], [`${item.key}Unit`, unit]]), ['materialId', classOptions.find(item => item.value === 'C40/50')?.value ?? classOptions[0]?.value ?? '']]) },
    validateParameters: p => [...dimensions.flatMap(item => [...numberParameter(p, `${item.key}Value`), ...(typeof p[`${item.key}Unit`] === 'string' && lengthOptions.some(unit => unit.value === p[`${item.key}Unit`]) ? [] : [`${item.label} requires a valid Length unit.`])]), ...(typeof p.materialId === 'string' && classOptions.some(item => item.value === p.materialId) ? [] : ['Select a supported ConcreteMaterial.'])],
    executor: async ({ node, inputs, services }) => {
      const geometry: Record<string, import('../domain/pierCandidates').LengthInput> = {}
      for (const item of dimensions) geometry[item.key] = (inputs[item.key] ?? localLength(node.parameters[`${item.key}Value`] as number, node.parameters[`${item.key}Unit`] as UnitId)) as import('../domain/pierCandidates').LengthInput
      const selectedMaterial = inputs.material ?? node.parameters.materialId
      const material = typeof selectedMaterial === 'string' ? services?.resolveConcreteMaterial ? await services.resolveConcreteMaterial(selectedMaterial) : { domainType: 'ConcreteMaterial' as const, id: selectedMaterial, name: selectedMaterial, properties: {} } : selectedMaterial as MaterialValue
      const generated = generatePierCapCandidatesWithStats({ capType, geometry, material })
      return { candidates: generated.candidates as GraphValue, generatedCombinations: generated.generatedCombinations, invalidCombinations: generated.invalidCombinations }
    },
  }
}
function foundationNode(type: 'SHALLOW' | 'PILED', label: string, fields: { key: string; label: string; defaultValue: number; integer?: boolean }[]): NodeDefinition {
  const shallow = type === 'SHALLOW'
  const inputs: NodePortDefinition[] = [...fields.map(field => ({ id: field.key, label: field.label, type: field.integer ? 'integer[]' as const : 'length[]' as const, quantityKind: field.integer ? undefined : 'length' as const })), { id: 'material', label: 'Material', type: 'concreteMaterial', domainType: 'ConcreteMaterial' }]
  const parameterSchema: ParameterDescriptor[] = [...fields.flatMap(field => [
    { key: `${field.key}Value`, label: `${field.label} local default`, dataType: field.integer ? 'integer' as const : 'number' as const, min: field.integer ? 1 : 0, step: field.integer ? 1 : .01, inputPortId: field.key },
    ...(!field.integer ? [{ key: `${field.key}Unit`, label: `${field.label} unit`, dataType: 'select' as const, options: lengthOptions, inputPortId: field.key }] : []),
  ]), { key: 'materialId', label: 'Material local default', dataType: 'select', options: classOptions, inputPortId: 'material' }]
  return {
    type: `substructure.foundation.${type.toLowerCase()}`, label, category: 'STRUCTURAL_FAMILY',
    description: `Generate deterministic ${label} geometric candidates. No structural or geotechnical design checks are performed.`,
    inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'foundationCandidate[]' }], parameterSchema,
    createDefaultParameters: projectUnits => { const unit = defaultUnit('length', projectUnits); return Object.fromEntries([...fields.flatMap(field => [[`${field.key}Value`, field.integer ? field.defaultValue : quantityFromCanonical(field.defaultValue, 'length', unit)], ...(!field.integer ? [[`${field.key}Unit`, unit]] : [])]), ['materialId', classOptions.find(item => item.value === 'C40/50')?.value ?? classOptions[0]?.value ?? '']]) },
    validateParameters: p => [...fields.flatMap(field => {const value=p[`${field.key}Value`];return [...numberParameter(p, `${field.key}Value`, !!field.integer), ...(!field.integer && typeof p[`${field.key}Unit`] === 'string' && lengthOptions.some(unit => unit.value === p[`${field.key}Unit`]) ? [] : !field.integer ? [`${field.label} requires a valid Length unit.`] : []), ...(typeof value === 'number' && (field.integer ? value < 1 : value <= 0) ? [`${field.label} local default is invalid.`] : [])]}), ...(typeof p.materialId === 'string' && classOptions.some(item => item.value === p.materialId) ? [] : ['Select a supported ConcreteMaterial.'])],
    executor: async ({ node, inputs, services }) => {
      const resolved: Record<string, GraphValue> = {}
      for (const field of fields) resolved[field.key] = inputs[field.key] ?? (field.integer ? node.parameters[`${field.key}Value`] : localLength(node.parameters[`${field.key}Value`] as number, node.parameters[`${field.key}Unit`] as UnitId)) as GraphValue
      const selected = inputs.material ?? node.parameters.materialId
      const material = typeof selected === 'string' ? services?.resolveConcreteMaterial ? await services.resolveConcreteMaterial(selected) : { domainType: 'ConcreteMaterial' as const, id: selected, name: selected, properties: {} } : selected as MaterialValue
      const generated = shallow
        ? generateShallowFoundationCandidates({ Lx: resolved.Lx as import('../domain/pierCandidates').LengthInput, Ly: resolved.Ly as import('../domain/pierCandidates').LengthInput, height: resolved.height as import('../domain/pierCandidates').LengthInput, material })
        : generatePiledFoundationCandidates({ pileDiameter: resolved.pileDiameter as import('../domain/pierCandidates').LengthInput, pileCountX: resolved.pileCountX as number | number[], pileSpacingX: resolved.pileSpacingX as import('../domain/pierCandidates').LengthInput, pileCountY: resolved.pileCountY as number | number[], pileSpacingY: resolved.pileSpacingY as import('../domain/pierCandidates').LengthInput, capHeight: resolved.capHeight as import('../domain/pierCandidates').LengthInput, material })
      return { candidates: generated.candidates as GraphValue, generatedCombinations: generated.generatedCombinations, invalidCombinations: generated.invalidCombinations }
    },
  }
}
function shallowFoundationNode() { return foundationNode('SHALLOW', 'Shallow Foundation', [{ key: 'Lx', label: 'Lx', defaultValue: 8 }, { key: 'Ly', label: 'Ly', defaultValue: 6 }, { key: 'height', label: 'Height', defaultValue: 2 }]) }
function piledFoundationNode() { return foundationNode('PILED', 'Piled Foundation', [{ key: 'pileDiameter', label: 'Pile Diameter D', defaultValue: 1.2 }, { key: 'pileCountX', label: 'Pile Count X nx', defaultValue: 4, integer: true }, { key: 'pileSpacingX', label: 'Pile Spacing X ax', defaultValue: 3.6 }, { key: 'pileCountY', label: 'Pile Count Y ny', defaultValue: 3, integer: true }, { key: 'pileSpacingY', label: 'Pile Spacing Y ay', defaultValue: 3.6 }, { key: 'capHeight', label: 'Cap Height', defaultValue: 2.5 }]) }
const noParameters=(p:Record<string,GraphParameterValue>)=>Object.keys(p).length?['This node does not accept parameters.']:[]
function numberParameter(p:Record<string,GraphParameterValue>,key:string,integer=false):string[]{const v=p[key];return typeof v!=='number'||!Number.isFinite(v)||(integer&&!Number.isInteger(v))?[`${key} must be a valid ${integer?'integer':'number'}.`]:[]}
function scalarDefinition(type:string,label:string,dataType:'number'|'integer'|'boolean'):NodeDefinition{return{type,label,category:'INPUT',description:`Provide a ${dataType} value.`,inputs:[],outputs:[{id:'value',label:'Value',type:dataType}],parameterSchema:[{key:'value',label:'Value',dataType,step:dataType==='integer'?1:.01}],createDefaultParameters:()=>({value:dataType==='boolean'?false:0}),validateParameters:p=>dataType==='boolean'?(typeof p.value==='boolean'?[]:['Value must be boolean.']):numberParameter(p,'value',dataType==='integer'),executor:({node})=>({value:node.parameters.value as GraphValue})}}
type NumericItem = number | import('../domain/quantities').EngineeringQuantity
function isQuantity(value: unknown): value is import('../domain/quantities').EngineeringQuantity { return typeof value === 'object' && value !== null && 'quantityKind' in value && 'value' in value && 'unit' in value }
function mathValue(a: NumericItem, b: NumericItem, operation:'add'|'subtract'|'multiply'|'divide'): NumericItem {
  const qa=isQuantity(a)?a:undefined,qb=isQuantity(b)?b:undefined
  if(qa||qb){let kind:QuantityKind,value:number,unit=(qa??qb)!.unit
    if(operation==='add'||operation==='subtract'){if(!qa||!qb||qa.quantityKind!==qb.quantityKind)throw new Error('Addition and subtraction require quantities of the same kind.');kind=qa.quantityKind;value=operation==='add'?qa.value+qb.value:qa.value-qb.value}
    else if(operation==='multiply'){if(qa&&qb)throw new Error('Multiplying two quantities is not supported yet.');if(!qa&&!qb)throw new Error('Expected numeric inputs.');kind=(qa??qb)!.quantityKind;value=(qa??qb)!.value*(typeof a==='number'?a:b as number)}
    else{if(!qa)throw new Error('The numerator must be a quantity when using quantity division.');if(typeof b!=='number')throw new Error('A quantity may only be divided by a dimensionless number.');if(b===0)throw new Error('Division by zero.');kind=qa.quantityKind;value=qa.value/b}
    if(!Number.isFinite(value))throw new Error('Operation produced a non-finite number.');return{value,quantityKind:kind,unit}
  }
  const x=a as number,y=b as number;if(operation==='divide'&&y===0)throw new Error('Division by zero.')
  const value=operation==='add'?x+y:operation==='subtract'?x-y:operation==='multiply'?x*y:x/y
  if(!Number.isFinite(value))throw new Error('Operation produced a non-finite number.');return value
}
function mathResult(a:GraphValue|undefined,b:GraphValue|undefined,operation:'add'|'subtract'|'multiply'|'divide'):GraphValue {
  if(a===undefined||b===undefined)throw new Error('Expected numeric inputs.')
  const left=Array.isArray(a)?a as NumericItem[]:[a as NumericItem],right=Array.isArray(b)?b as NumericItem[]:[b as NumericItem]
  for(const item of [...left,...right])if(typeof item!=='number'&&!isQuantity(item))throw new Error('Expected numeric inputs.')
  if(left.length!==right.length&&left.length!==1&&right.length!==1)throw new Error(`List lengths do not match (${left.length} and ${right.length}).`)
  const count=left.length===0||right.length===0?0:Math.max(left.length,right.length);if(count===0)return []
  const result=Array.from({length:count},(_,i)=>mathValue(left[left.length===1?0:i],right[right.length===1?0:i],operation))
  return Array.isArray(a)||Array.isArray(b)?result as GraphValue:result[0] as GraphValue
}
function math(type:string,label:string,operation:'add'|'subtract'|'multiply'|'divide'):NodeDefinition{return{type,label,category:'MATH',description:`${label} scalar or list numeric values with singleton broadcasting.`,inputs:[{id:'a',label:'A',type:'numeric',required:true},{id:'b',label:'B',type:'numeric',required:true}],outputs:[{id:'result',label:'Result',type:'numeric'}],parameterSchema:[],createDefaultParameters:()=>({}),validateParameters:noParameters,executor:({inputs})=>({result:mathResult(inputs.a,inputs.b,operation)})}}
function materialNode(type:string,label:string,domainType:MaterialValue['domainType'],options:readonly {value:string;label:string}[]=[]):NodeDefinition{return{type,label,category:'MATERIALS',description:`Create a typed ${label} material reference from configured project data.`,inputs:[],outputs:[{id:'material',label, type:domainType==='ConcreteMaterial'?'concreteMaterial':domainType==='ReinforcementMaterial'?'reinforcementMaterial':domainType==='PrestressingSteelMaterial'?'prestressingSteelMaterial':'structuralSteelMaterial',domainType}],parameterSchema:[{key:'materialId',label:'Material',dataType:'select',options}],createDefaultParameters:()=>({materialId:options.find(option=>option.value==='C40/50')?.value??options[0]?.value??''}),validateParameters:p=>typeof p.materialId!=='string'||!options.some(o=>o.value===p.materialId)?[options.length?'Select a supported material.':`${label} catalog data are not configured in SPANOVA.`]:[],executor:async({node,services})=>{const id=node.parameters.materialId as string;if(!options.some(o=>o.value===id))throw new Error(`Unknown ${label} material ID: ${id}.`);if(domainType==='ConcreteMaterial'&&services?.resolveConcreteMaterial)return{material:await services.resolveConcreteMaterial(id)};return{material:{domainType,id,name:id,properties:{}}}}}}
const definitions:NodeDefinition[]=[
 scalarDefinition('input.number','Number','number'),scalarDefinition('input.integer','Integer','integer'),scalarDefinition('input.boolean','Boolean','boolean'),
 {type:'input.integer-list',label:'Integer List',category:'INPUT',description:'Provide explicit integer design alternatives as a comma-separated list.',inputs:[],outputs:[{id:'values',label:'Values',type:'integer[]'}],parameterSchema:[{key:'valuesText',label:'Values',dataType:'string'}],createDefaultParameters:()=>({valuesText:'3, 4'}),validateParameters:p=>{const parsed=parseIntegerList(String(p.valuesText??''));return parsed.error?[parsed.error]:[]},executor:({node})=>({values:parseIntegerList(String(node.parameters.valuesText??'')).values})},
 {type:'input.quantity',label:'Quantity',category:'INPUT',description:'Provide a unit-aware engineering quantity.',inputs:[],outputs:[{id:'value',label:'Value',type:'quantity'}],parameterSchema:[{key:'value',label:'Value',dataType:'number',step:.01},{key:'quantityKind',label:'Quantity Kind',dataType:'select',options:[{value:'length',label:'Length'},{value:'area',label:'Area'},{value:'volume',label:'Volume'},{value:'angle',label:'Angle'},{value:'force',label:'Force'},{value:'moment',label:'Moment'},{value:'stress',label:'Stress'},{value:'mass',label:'Mass'},{value:'density',label:'Density'},{value:'unitWeight',label:'Unit Weight'},{value:'temperature',label:'Temperature'},{value:'temperatureDifference',label:'Temperature Difference'},{value:'acceleration',label:'Acceleration'},{value:'translationalStiffness',label:'Translational Stiffness'},{value:'rotationalStiffness',label:'Rotational Stiffness'},{value:'dimensionless',label:'Dimensionless'}]},
  {key:'unit',label:'Unit',dataType:'select',options:[] }],createDefaultParameters:(prefs)=>{const kind='length';return{value:1,quantityKind:kind,unit:defaultUnit(kind,prefs)}},validateParameters:p=>quantityErrors(p,false),executor:({node})=>({value:makeQuantity(node.parameters.value as number,node.parameters.quantityKind as QuantityKind,node.parameters.unit as UnitId)})},
 {type:'input.range',label:'Range',category:'INPUT',description:'Generate inclusive, stepped numeric or quantity values from scalar Start, End and Step inputs.',inputs:[{id:'start',label:'Start',type:'numeric'},{id:'end',label:'End',type:'numeric'},{id:'increment',label:'Step',type:'numeric'}],outputs:[{id:'values',label:'Values',type:'numeric[]'}],parameterSchema:[{key:'min',label:'Start',dataType:'number',step:.01,inputPortId:'start'},{key:'max',label:'End',dataType:'number',step:.01,inputPortId:'end'},{key:'step',label:'Step',dataType:'number',step:.01,inputPortId:'increment'},{key:'quantityKind',label:'Quantity Kind',dataType:'select',options:[{value:'dimensionless',label:'Dimensionless'},{value:'length',label:'Length'},{value:'area',label:'Area'},{value:'volume',label:'Volume'},{value:'angle',label:'Angle'},{value:'force',label:'Force'},{value:'moment',label:'Moment'},{value:'stress',label:'Stress'},{value:'mass',label:'Mass'},{value:'density',label:'Density'},{value:'unitWeight',label:'Unit Weight'},{value:'temperature',label:'Temperature'},{value:'temperatureDifference',label:'Temperature Difference'},{value:'acceleration',label:'Acceleration'},{value:'translationalStiffness',label:'Translational Stiffness'},{value:'rotationalStiffness',label:'Rotational Stiffness'}]},{key:'unit',label:'Unit',dataType:'select',options:[]}],createDefaultParameters:prefs=>({min:0,max:10,step:1,quantityKind:'dimensionless',unit:defaultUnit('dimensionless',prefs)}),validateParameters:p=>[...numberParameter(p,'min'),...numberParameter(p,'max'),...numberParameter(p,'step'),...(typeof p.step==='number'&&p.step===0?['Step must not be zero.']:[]),...(typeof p.min==='number'&&typeof p.max==='number'&&typeof p.step==='number'&&((p.step>0&&p.max<p.min)||(p.step<0&&p.max>p.min))?['Step direction must move from Start toward End.']:[]),...quantityErrors(p,true),...(typeof p.min==='number'&&typeof p.max==='number'&&typeof p.step==='number'&&p.step!==0&&Math.floor((p.max-p.min)/p.step+1e-10)>9999?['Range exceeds the 10,000 value execution limit.']:[])],executor:({node,inputs})=>({values:generateRangeValues(node,inputs)})},
 math('math.add','Add','add'),math('math.subtract','Subtract','subtract'),math('math.multiply','Multiply','multiply'),math('math.divide','Divide','divide'),
 materialNode('material.concrete','Concrete','ConcreteMaterial',classOptions),materialNode('material.reinforcement','Reinforcement Steel','ReinforcementMaterial'),materialNode('material.prestressing','Prestressing Steel','PrestressingSteelMaterial'),materialNode('material.structuralSteel','Structural Steel','StructuralSteelMaterial'),
 ...pierDefinitions,
 ...pierCapDefinitions,
 ...foundationDefinitions,
 {type:'output.watch',label:'Watch',category:'OUTPUT',description:'Inspect an arbitrary graph value for debugging.',inputs:[{id:'value',label:'Value',type:'display:any',required:true}],outputs:[],parameterSchema:[],createDefaultParameters:()=>({}),validateParameters:noParameters,executor:({inputs})=>({value:inputs.value})},
 {type:'output.list',label:'List',category:'OUTPUT',description:'Display values and engineering alternatives as an indexed read-only list.',inputs:[{id:'items',label:'Items',type:'display:any',required:true}],outputs:[],parameterSchema:[],createDefaultParameters:()=>({}),validateParameters:noParameters,executor:({inputs})=>({value:inputs.items})},
]
function quantityErrors(p:Record<string,GraphParameterValue>,range:boolean):string[]{const kind=(p.quantityKind??'dimensionless') as QuantityKind;const unit=(p.unit??'1') as string;const u=getValidUnit(unit,kind);const errors:string[]=[];if(!UNIT_KINDS.includes(kind))errors.push('Select a valid quantity kind.');if(!u)errors.push(`Unit ${String(p.unit)} is invalid for ${String(kind)}.`);if(!range)errors.push(...numberParameter(p,'value'));return errors}
function rangeScalar(input:GraphValue|undefined,fallback:number,kind:QuantityKind,unit:UnitId):number {if(input===undefined)return fallback;if(typeof input==='number')return input;if(isQuantity(input)){if(input.quantityKind!==kind)throw new Error(`Range inputs must use ${kind} quantities.`);return quantityFromCanonical(input.value,kind,unit)}throw new Error('Range Start, End and Step require scalar numeric inputs.')}
function getValidUnit(unit:string,kind:QuantityKind){return unitsForKind(kind).some(u=>u.id===unit)}
function defaultUnit(kind:string,prefs?:Record<string,string>){const prefKey:Record<string,string>={length:'length',force:'force',moment:'moment',stress:'stress',mass:'mass',temperature:'temperature'};const pref=prefs?.[prefKey[kind]??''];const match=unitsForKind(kind as QuantityKind).find(u=>u.label===pref||u.id===pref);return match?.id??unitsForKind(kind as QuantityKind)[0]?.id??'1'}
export const NODE_REGISTRY:readonly NodeDefinition[]=definitions
const byType=new Map(definitions.map(d=>[d.type,d]))
export function getNodeDefinition(type:string){return byType.get(type)}
export function getNodeDefinitions(category?:NodeCategory){return category?definitions.filter(d=>d.category===category):definitions}
export function previewDesignOutput(node:SpanovaNode,portId:string,inputs:Record<string,GraphValue>):GraphValue|undefined {
  if(node.type==='input.range'&&portId==='values')return generateRangeValues(node,inputs)
  const operation=node.type==='math.add'?'add':node.type==='math.subtract'?'subtract':node.type==='math.multiply'?'multiply':node.type==='math.divide'?'divide':undefined
  if(operation&&portId==='result')return mathResult(inputs.a,inputs.b,operation)
  if(node.type.startsWith('substructure.pier.')&&portId==='candidates'){
    const definition=byType.get(node.type)
    const pierType=pierDefinitions.find(item=>item.type===node.type)?.type.replace('substructure.pier.','').toUpperCase() as import('../domain/types').PierCandidate['pierType']|undefined
    if(!definition||!pierType)return undefined
    const geometry:Record<string,import('../domain/pierCandidates').LengthInput>={}
    for(const parameter of definition.parameterSchema.filter(item=>item.key.endsWith('Value')&&item.key!=='heightValue')){
      const key=parameter.key.slice(0,-5),port=parameter.inputPortId
      if(!port)return undefined
      geometry[key]=(inputs[port]??localLength(node.parameters[parameter.key] as number,node.parameters[`${key}Unit`] as UnitId)) as import('../domain/pierCandidates').LengthInput
    }
    const height=(inputs.height??localLength(node.parameters.heightValue as number,node.parameters.heightUnit as UnitId)) as import('../domain/pierCandidates').LengthInput
    const selectedMaterial=inputs.material??node.parameters.materialId
    const material=typeof selectedMaterial==='string'?{domainType:'ConcreteMaterial' as const,id:selectedMaterial,name:selectedMaterial,properties:{}}:selectedMaterial as MaterialValue
    return generatePierCandidatesWithStats({pierType,geometry,height,columnCount:(inputs.columns??node.parameters.columns) as number,material}).candidates as GraphValue
  }
  if(node.type.startsWith('substructure.pier-cap.')&&portId==='candidates'){
    const definition=byType.get(node.type)
    const capType=pierCapDefinitions.find(item=>item.type===node.type)?.type.replace('substructure.pier-cap.','').toUpperCase() as import('../domain/pierCapCandidates').PierCapType|undefined
    if(!definition||!capType)return undefined
    const geometry:Record<string,import('../domain/pierCandidates').LengthInput>={}
    for(const parameter of definition.parameterSchema.filter(item=>item.key.endsWith('Value'))){const key=parameter.key.slice(0,-5);geometry[key]=(inputs[key]??localLength(node.parameters[parameter.key] as number,node.parameters[`${key}Unit`] as UnitId)) as import('../domain/pierCandidates').LengthInput}
    const selectedMaterial=inputs.material??node.parameters.materialId
    const material=typeof selectedMaterial==='string'?{domainType:'ConcreteMaterial' as const,id:selectedMaterial,name:selectedMaterial,properties:{}}:selectedMaterial as MaterialValue
    return generatePierCapCandidatesWithStats({capType,geometry,material}).candidates as GraphValue
  }
  if(node.type.startsWith('substructure.foundation.')&&portId==='candidates'){
    const definition=byType.get(node.type)
    if(!definition)return undefined
    const inputsResolved:Record<string,GraphValue>={...inputs}
    for(const field of definition.inputs.filter(item=>item.id!=='material')) inputsResolved[field.id]??=field.type==='integer[]'?node.parameters[`${field.id}Value`] as number:localLength(node.parameters[`${field.id}Value`] as number,node.parameters[`${field.id}Unit`] as UnitId)
    const materialValue=inputsResolved.material??node.parameters.materialId
    const material=typeof materialValue==='string'?{domainType:'ConcreteMaterial' as const,id:materialValue,name:materialValue,properties:{}}:materialValue as MaterialValue
    const generated=node.type.endsWith('.shallow')?generateShallowFoundationCandidates({Lx:inputsResolved.Lx as import('../domain/pierCandidates').LengthInput,Ly:inputsResolved.Ly as import('../domain/pierCandidates').LengthInput,height:inputsResolved.height as import('../domain/pierCandidates').LengthInput,material}):generatePiledFoundationCandidates({pileDiameter:inputsResolved.pileDiameter as import('../domain/pierCandidates').LengthInput,pileCountX:inputsResolved.pileCountX as number|number[],pileSpacingX:inputsResolved.pileSpacingX as import('../domain/pierCandidates').LengthInput,pileCountY:inputsResolved.pileCountY as number|number[],pileSpacingY:inputsResolved.pileSpacingY as import('../domain/pierCandidates').LengthInput,capHeight:inputsResolved.capHeight as import('../domain/pierCandidates').LengthInput,material})
    return generated.candidates as GraphValue
  }
  return undefined
}
export function previewPierCapStatistics(node:SpanovaNode, inputs:Record<string,GraphValue>, validCandidates:number) {
  const capType=pierCapDefinitions.find(item=>item.type===node.type)?.type.replace('substructure.pier-cap.','').toUpperCase() as import('../domain/pierCapCandidates').PierCapType|undefined
  if(!capType)return undefined
  const definition=byType.get(node.type)!
  const counts=definition.parameterSchema.filter(item=>item.key.endsWith('Value')).map(parameter=>{const key=parameter.key.slice(0,-5),value=(inputs[key]??localLength(node.parameters[parameter.key] as number,node.parameters[`${key}Unit`] as UnitId)) as import('../domain/pierCandidates').LengthInput;return normalizeCandidateInput(value,key).length})
  const generatedCombinations=counts.reduce((count,length)=>count*length,1)
  return {generatedCombinations,invalidCombinations:generatedCombinations-validCandidates}
}
export function previewFoundationStatistics(node:SpanovaNode, inputs:Record<string,GraphValue>, validCandidates:number) {
  const definition=byType.get(node.type);if(!definition)return undefined
  const counts=definition.inputs.filter(item=>item.id!=='material').map(port=>{const value=inputs[port.id]??(port.type==='integer[]'?node.parameters[`${port.id}Value`]:localLength(node.parameters[`${port.id}Value`] as number,node.parameters[`${port.id}Unit`] as UnitId));return normalizeCandidateInput(value as import('../domain/pierCandidates').LengthInput,port.id).length})
  const generatedCombinations=counts.reduce((count,length)=>count*length,1)
  return {generatedCombinations,invalidCombinations:generatedCombinations-validCandidates}
}
function parseIntegerList(value:string){const tokens=value.split(',').map(item=>item.trim());const values=tokens.map(Number);const error=!value.trim()||values.some(item=>!Number.isFinite(item)||!Number.isInteger(item))?'Values must be a comma-separated list of finite integers.':undefined;return{values,error}}
function generateRangeValues(node:SpanovaNode,inputs:Record<string,GraphValue>):GraphValue {
  const p=node.parameters as {min:number;max:number;step:number;quantityKind?:QuantityKind;unit?:UnitId};const kind=p.quantityKind??'dimensionless',unit=p.unit??'1'
  const start=rangeScalar(inputs.start,p.min,kind,unit),end=rangeScalar(inputs.end,p.max,kind,unit),step=rangeScalar(inputs.increment,p.step,kind,unit)
  if(![start,end,step].every(Number.isFinite))throw new Error('Range Start, End and Step must be finite.')
  if(step===0)throw new Error('Step must not be zero.')
  if((step>0&&end<start)||(step<0&&end>start))throw new Error('Step direction must move from Start toward End.')
  const count=Math.floor((end-start)/step+1e-10);if(count>9999)throw new Error('Range exceeds the 10,000 value execution limit.')
  const values=Array.from({length:count+1},(_,index)=>Number((start+index*step).toFixed(10)))
  return kind==='dimensionless'?values:values.map(value=>makeQuantity(value,kind,unit))
}
export function canConnect(source:GraphPortType,target:GraphPortType,sourceKind?:QuantityKind,targetKind?:QuantityKind){
  if(target==='display:any')return ['number','integer','boolean','string','number[]','integer[]','numeric[]','quantity','quantity[]','length','length[]','concreteMaterial','reinforcementMaterial','prestressingSteelMaterial','structuralSteelMaterial','numeric','pierCandidate[]','pierCapCandidate[]','foundationCandidate[]'].includes(source)
  if(target==='numeric')return ['number','integer','quantity','numeric'].includes(source)
  if(target==='integer[]')return source==='integer'||source==='integer[]'||(['number[]','numeric','numeric[]'].includes(source)&&(sourceKind===undefined||sourceKind==='dimensionless'))
  const requiredKind=targetKind??(target==='length'||target==='length[]'?'length':undefined)
  if(requiredKind){
    const numericSource=source==='number'||source==='integer'||source==='numeric'||source==='number[]'||source==='integer[]'||source==='numeric[]'
    if(numericSource)return sourceKind===undefined||sourceKind==='dimensionless'||sourceKind===requiredKind
    const quantitySource=source==='quantity'||source==='quantity[]'||source==='length'||source==='length[]'
    return quantitySource&&sourceKind===requiredKind
  }
  if((target==='quantity'||target==='quantity[]')&&(source==='quantity'||source==='quantity[]')&&sourceKind&&targetKind)return sourceKind===targetKind
  if(source==='quantity'&&target==='quantity'&&sourceKind&&targetKind)return sourceKind===targetKind
  return source===target||(source==='integer'&&target==='number')
}
