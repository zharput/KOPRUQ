import type { GraphParameterValue, GraphPortType, GraphValue, MaterialValue, SpanovaNode } from '../domain/types'
import { makeQuantity, quantityFromCanonical, QUANTITY_KINDS as UNIT_KINDS, type QuantityKind, type UnitId, unitsForKind } from '../domain/quantities'
import { EN_CONCRETE_CLASS_IDS, STRUCTURAL_STEEL_OPTIONS } from '../../materials/model/materialCatalog'
import { generatePierCandidatesWithStats, localLength, normalizeCandidateInput } from '../domain/pierCandidates'
import { generatePierCapCandidatesWithStats } from '../domain/pierCapCandidates'
import { generatePiledFoundationCandidates, generateShallowFoundationCandidates } from '../domain/foundationCandidates'
import { countBearingValues, generateElastomericBearingCandidates } from '../domain/bearingCandidates'
import type { NodeCategory } from '../domain/nodeVisualThemes'
import { generateSteelGirderCandidates, generatePrecastGirderCandidates } from '../domain/girderCandidates'
import { generateSuperstructureCandidates } from '../domain/superstructureCandidates'
import { resolveBridgeAssembly } from '../domain/bridgeAssembly'
import { generateAbutmentCandidates } from '../domain/abutmentCandidates'

export type { NodeCategory } from '../domain/nodeVisualThemes'
export type ParameterDescriptor = { key: string; label: string; dataType: 'number' | 'integer' | 'boolean' | 'string' | 'select'; min?: number; step?: number; options?: readonly { value: string; label: string }[]; inputPortId?: string }
export type NodePortDefinition = { id: string; label: string; type: GraphPortType; quantityKind?: QuantityKind; domainType?: MaterialValue['domainType']; required?: boolean; description?: string; group?: string }
export interface GraphExecutionServices { resolveConcreteMaterial?: (materialId:string)=>Promise<MaterialValue>; projectUnits?: Partial<Record<QuantityKind, string>> }
export type NodeExecutionContext = { node: SpanovaNode; inputs: Record<string, GraphValue>; services?: GraphExecutionServices }
export interface EngineeringInspectorSchema { schematic: 'pier' | 'pier-cap' | 'foundation' | 'bearing' | 'girder' | 'superstructure' | 'abutment'; parameterOrder: readonly string[] }
export interface NodeDefinition { type: string; label: string; category: NodeCategory; description: string; inputs: NodePortDefinition[]; outputs: NodePortDefinition[]; parameterSchema: ParameterDescriptor[]; engineeringInspector?: EngineeringInspectorSchema; createDefaultParameters: (projectUnits?: Record<string,string>) => Record<string,GraphParameterValue>; validateParameters: (parameters: Record<string,GraphParameterValue>) => string[]; executor: (context:NodeExecutionContext)=>Record<string,GraphValue>|Promise<Record<string,GraphValue>> }
const classOptions=EN_CONCRETE_CLASS_IDS.map(value=>({value,label:value}))
const lengthOptions = unitsForKind('length').map(unit => ({ value: unit.id, label: unit.label }))
const pierDefinitions = [
  pierNode('CIRCULAR', 'Circular Pier', [{ key: 'D', label: 'Diameter', port: 'diameter', defaultValue: 2 }]),
  pierNode('RECTANGULAR', 'Rectangular Pier', [{ key: 'B', label: 'B - Transverse', port: 'width', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'depth', defaultValue: 1.5 }]),
  pierNode('OVAL', 'Oval Pier', [{ key: 'B', label: 'B - Transverse', port: 'width', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'depth', defaultValue: 1.5 }]),
  pierNode('BOX', 'Box Pier', [{ key: 'B', label: 'B - Transverse', port: 'outerWidth', defaultValue: 3 }, { key: 'D', label: 'D - Longitudinal', port: 'outerDepth', defaultValue: 1.5 }, { key: 'tw', label: 'Wall thickness', port: 'wallThickness', defaultValue: .3 }]),
  pierNode('H_SECTION', 'H Pier', [{ key: 'B', label: 'Overall Width', port: 'width', defaultValue: 3 }, { key: 'D', label: 'Overall Depth', port: 'depth', defaultValue: 6 }, { key: 'tw', label: 'Web Thickness', port: 'webThickness', defaultValue: 3 }, { key: 'tf', label: 'Flange Thickness', port: 'flangeThickness', defaultValue: .75 }]),
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
const BEARING_FIELDS = [
  { key: 'lengthX', label: 'Length X', kind: 'length' as const, group: 'GEOMETRY', defaultValue: .6 },
  { key: 'widthY', label: 'Width Y', kind: 'length' as const, group: 'GEOMETRY', defaultValue: .7 },
  { key: 'totalHeight', label: 'Total Height', kind: 'length' as const, group: 'GEOMETRY', defaultValue: .15 },
  { key: 'kx', label: 'Kx', kind: 'translationalStiffness' as const, group: 'STIFFNESS', defaultValue: 3000 },
  { key: 'ky', label: 'Ky', kind: 'translationalStiffness' as const, group: 'STIFFNESS', defaultValue: 30000 },
  { key: 'kz', label: 'Kz', kind: 'translationalStiffness' as const, group: 'STIFFNESS', defaultValue: 100000 },
  { key: 'krx', label: 'Krx', kind: 'rotationalStiffness' as const, group: 'STIFFNESS', defaultValue: 100000 },
  { key: 'kry', label: 'Kry', kind: 'rotationalStiffness' as const, group: 'STIFFNESS', defaultValue: 100000 },
  { key: 'krz', label: 'Krz', kind: 'rotationalStiffness' as const, group: 'STIFFNESS', defaultValue: 100000 },
]
const elastomericBearingDefinition = elastomericBearingNode()
const girderLengthOptions = unitsForKind('length').map(unit => ({ value: unit.id, label: unit.label }))
function girderDefault(kind:'PRECAST'|'STEEL',key:string){if(kind==='STEEL')return ({H:2.5,Btf:.8,ttf:.04,Bbf:.9,tbf:.05,tw:.02} as Record<string,number>)[key] ?? 1.9; return ({H:1.9,tf:1.5,bf:.8,w:.2,th1:.12,th2:.1,bh1:.28,bh2:.15} as Record<string,number>)[key] ?? 1.9}
function girderNode(kind:'PRECAST'|'STEEL'):NodeDefinition {
  const steel=kind==='STEEL', fields=steel?['H','Btf','ttf','Bbf','tbf','tw']:['H','tf','bf','w','th1','th2','bh1','bh2'], labels:Record<string,string>={H:'Girder Height',Btf:'Top Flange Width',ttf:'Top Flange Thickness',Bbf:'Bottom Flange Width',tbf:'Bottom Flange Thickness',tw:'Web Thickness',tf:'Top Flange Width',bf:'Bottom Flange Width',w:'Web Width',th1:'Top Cap Thickness',th2:'Top Taper Thickness',bh1:'Bottom Block Thickness',bh2:'Bottom Taper Thickness'}
  const inputs:NodePortDefinition[]=fields.map(key=>({id:key,label:labels[key],type:'length[]' as const,quantityKind:'length' as const}));inputs.push({id:'material',label:steel?'Structural Steel':'Concrete Material',type:steel?'structuralSteelMaterial':'concreteMaterial',required:true})
  const parameterSchema:ParameterDescriptor[]=fields.flatMap(key=>[{key:`${key}Value`,label:labels[key],dataType:'number' as const,step:.001,inputPortId:key},{key:`${key}Unit`,label:`${labels[key]} unit`,dataType:'select' as const,options:girderLengthOptions,inputPortId:key}]);parameterSchema.push({key:'familyId',label:'Family Name',dataType:'string'},{key:'preferredSpanValue',label:'Preferred Span',dataType:'number',step:.01},{key:'preferredSpanUnit',label:'Preferred Span unit',dataType:'select',options:girderLengthOptions},{key:'minSpanValue',label:'Minimum Applicable Span',dataType:'number',step:.01},{key:'minSpanUnit',label:'Minimum Span unit',dataType:'select',options:girderLengthOptions},{key:'maxSpanValue',label:'Maximum Applicable Span',dataType:'number',step:.01},{key:'maxSpanUnit',label:'Maximum Span unit',dataType:'select',options:girderLengthOptions},{key:'materialId',label:'Material',dataType:'select',options:steel?STRUCTURAL_STEEL_OPTIONS:classOptions})
  return {type:`structural.girder.${kind.toLowerCase()}`,label:steel?'Steel Girder':'Precast Girder',category:'STRUCTURAL_FAMILY',description:`Generate deterministic ${steel?'welded steel I':'precast I'} girder section candidates.`,inputs,outputs:[{id:'candidates',label:'Candidates',type:'girderCandidate[]'}],parameterSchema,engineeringInspector:{schematic:'girder',parameterOrder:[...fields,'material','preferredSpan','applicableSpanRange']},createDefaultParameters:prefs=>{const p:Record<string,GraphParameterValue>={};for(const key of fields){p[key + 'Value']=girderDefault(kind,key);p[key + 'Unit']=defaultUnit('length',prefs)}Object.assign(p,{familyId:steel?'SG-01':'PG-200',preferredSpanValue:steel?60:40,preferredSpanUnit:defaultUnit('length',prefs),minSpanValue:30,minSpanUnit:defaultUnit('length',prefs),maxSpanValue:90,maxSpanUnit:defaultUnit('length',prefs),materialId:steel?'S355':'C40/50'});return p},validateParameters:p=>[...fields.flatMap(key=>numberParameter(p,`${key}Value`)),...(steel&&typeof p.materialId==='string'&&STRUCTURAL_STEEL_OPTIONS.some(item=>item.value===p.materialId)?[]:steel?['Select a supported Structural Steel grade.']:[])],executor:({node,inputs})=>{const geometry=Object.fromEntries(fields.map(key=>[key,inputs[key]??localLength(node.parameters[`${key}Value`] as number,node.parameters[`${key}Unit`] as UnitId)]));const material=(inputs.material??{domainType:steel?'StructuralSteelMaterial':'ConcreteMaterial',id:String(node.parameters.materialId??''),name:String(node.parameters.materialId??''),properties:{}}) as MaterialValue;const args={geometry,material,preferredSpan:node.parameters.preferredSpanValue as number,minSpan:node.parameters.minSpanValue as number,maxSpan:node.parameters.maxSpanValue as number,familyId:String(node.parameters.familyId)};return {candidates:(steel ? generateSteelGirderCandidates({H:geometry.H as never,Btf:geometry.Btf as never,ttf:geometry.ttf as never,Bbf:geometry.Bbf as never,tbf:geometry.tbf as never,tw:geometry.tw as never,material,preferredSpan:args.preferredSpan,minSpan:args.minSpan,maxSpan:args.maxSpan,familyId:args.familyId}) : generatePrecastGirderCandidates(args as never)).candidates as unknown as GraphValue}}}
}
const girderDefinitions=[girderNode('PRECAST'),girderNode('STEEL')]
const abutmentDefinition: NodeDefinition = {
  type: 'structural.abutment', label: 'Abutment', category: 'STRUCTURAL_FAMILY',
  description: 'Generate a parametrically connected abutment with seismic blocks and foundation geometry.',
  inputs: [
    { id: 'girder', label: 'Girder', type: 'girderCandidate[]' },
    { id: 'superstructure', label: 'Superstructure', type: 'superstructureCandidate[]' },
    { id: 'bearing', label: 'Bearing', type: 'bearingCandidate[]' },
    ...['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d','sei_u'].map(id => ({ id, label: id, type: 'length[]' as const, quantityKind: 'length' as const })),
  ],
  outputs: [{ id: 'candidates', label: 'Candidates', type: 'abutmentCandidate[]' }],
  parameterSchema: [
    ...['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d'].flatMap(key => [{ key: `${key}Value`, label: key, dataType: 'number' as const, step: .01, inputPortId: key }, { key: `${key}Unit`, label: `${key} unit`, dataType: 'select' as const, options: lengthOptions, inputPortId: key }]),
    { key: 'sei_uValue', label: 'sei_u', dataType: 'number' as const, step: .001, inputPortId: 'sei_u' }, { key: 'sei_uUnit', label: 'sei_u unit', dataType: 'select' as const, options: lengthOptions, inputPortId: 'sei_u' },
  ],
  engineeringInspector: { schematic: 'abutment', parameterOrder: ['girder','superstructure','bearing'] },
  createDefaultParameters: prefs => { const unit = defaultUnit('length', prefs); return Object.fromEntries(['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d'].flatMap((key, index) => [[`${key}Value`, quantityFromCanonical([1, 1, 1, 3, 5, 1, 2, 18][index], 'length', unit)], [`${key}Unit`, unit] ]).concat([['sei_uValue', quantityFromCanonical(.03, 'length', unit)], ['sei_uUnit', unit]])) },
  validateParameters: p => ['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d','sei_u'].flatMap(key => numberParameter(p, `${key}Value`)),
  executor: ({ node, inputs }) => ({ candidates: generateAbutmentCandidates({ geometry: Object.fromEntries(['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d'].map(key => [key, inputs[key] ?? localLength(Number(node.parameters[`${key}Value`]), String(node.parameters[`${key}Unit`]))])) as Record<string, number | number[] | { value: number }>, seiU: inputs.sei_u as never ?? localLength(Number(node.parameters.sei_uValue), String(node.parameters.sei_uUnit)), girder: inputs.girder, superstructure: inputs.superstructure, bearing: inputs.bearing }).candidates as unknown as GraphValue })
}
function resolveGirderCandidates(value: GraphValue | undefined): import('../domain/girderCandidates').GirderCandidate[] { if (Array.isArray(value)) return value.filter(item => typeof item === 'object' && item !== null && 'girderType' in item && 'geometry' in item).map(item => item as unknown as import('../domain/girderCandidates').GirderCandidate); if (typeof value === 'object' && value !== null && 'candidates' in value && Array.isArray(value.candidates)) return resolveGirderCandidates(value.candidates as GraphValue); if (typeof value === 'object' && value !== null && 'girderType' in value && 'geometry' in value) return [value as unknown as import('../domain/girderCandidates').GirderCandidate]; return [] }
function resolvedSuperstructureLength(value: GraphValue | undefined, fallback: import('../domain/pierCandidates').LengthInput, label: string): number | number[] { return normalizeCandidateInput((value ?? fallback) as import('../domain/pierCandidates').LengthInput, label) }
const superstructureDefinition: NodeDefinition = { type:'structural.superstructure', label:'Superstructure', category:'STRUCTURAL_FAMILY', description:'Arrange a connected girder candidate into a deck cross-section.', inputs:[{id:'girder',label:'Girder',type:'girderCandidate[]',required:true},{id:'deckWidth',label:'Deck Width',type:'length[]',quantityKind:'length'},{id:'girderCount',label:'Girder Count',type:'integer'},{id:'girderSpacing',label:'Girder Spacing',type:'length[]',quantityKind:'length'},{id:'deckSlabThickness',label:'Deck Slab Thickness',type:'length[]',quantityKind:'length'},{id:'deckConcrete',label:'Deck Concrete',type:'concreteMaterial'}], outputs:[{id:'candidates',label:'Candidates',type:'superstructureCandidate[]'}], parameterSchema:[{key:'deckWidthValue',label:'Deck Width',dataType:'number',step:.01,inputPortId:'deckWidth'},{key:'deckWidthUnit',label:'Deck Width unit',dataType:'select',options:girderLengthOptions,inputPortId:'deckWidth'},{key:'girderCount',label:'Girder Count',dataType:'integer',min:2,step:1,inputPortId:'girderCount'},{key:'girderSpacingValue',label:'Girder Spacing',dataType:'number',step:.01,inputPortId:'girderSpacing'},{key:'girderSpacingUnit',label:'Girder Spacing unit',dataType:'select',options:girderLengthOptions,inputPortId:'girderSpacing'},{key:'deckSlabThicknessValue',label:'Deck Slab Thickness',dataType:'number',step:.01,inputPortId:'deckSlabThickness'},{key:'deckSlabThicknessUnit',label:'Deck Slab Thickness unit',dataType:'select',options:girderLengthOptions,inputPortId:'deckSlabThickness'},{key:'deckConcreteId',label:'Material',dataType:'select',options:classOptions,inputPortId:'deckConcrete'}], engineeringInspector:{schematic:'superstructure',parameterOrder:['deckWidth','girderCount','girderSpacing','deckConcrete']}, createDefaultParameters:prefs=>({deckWidthValue:15,deckWidthUnit:defaultUnit('length',prefs),girderCount:6,girderSpacingValue:2.5,girderSpacingUnit:defaultUnit('length',prefs),deckSlabThicknessValue:.25,deckSlabThicknessUnit:defaultUnit('length',prefs),deckConcreteId:'C30/37'}), validateParameters:p=>[...numberParameter(p,'deckWidthValue'),...numberParameter(p,'girderCount'),...numberParameter(p,'girderSpacingValue'),...numberParameter(p,'deckSlabThicknessValue')], executor:({node,inputs})=>{const material=(inputs.deckConcrete??{domainType:'ConcreteMaterial',id:String(node.parameters.deckConcreteId??'C30/37'),name:String(node.parameters.deckConcreteId??'C30/37'),properties:{}}) as MaterialValue;const result=generateSuperstructureCandidates({girders:resolveGirderCandidates(inputs.girder),deckWidth:resolvedSuperstructureLength(inputs.deckWidth,localLength(Number(node.parameters.deckWidthValue),String(node.parameters.deckWidthUnit)),'Deck Width'),girderCount:(inputs.girderCount??node.parameters.girderCount) as never,girderSpacing:resolvedSuperstructureLength(inputs.girderSpacing,localLength(Number(node.parameters.girderSpacingValue),String(node.parameters.girderSpacingUnit)),'Girder Spacing'),deckSlabThickness:resolvedSuperstructureLength(inputs.deckSlabThickness,localLength(Number(node.parameters.deckSlabThicknessValue),String(node.parameters.deckSlabThicknessUnit)),'Deck Slab Thickness'),deckConcrete:material});return result as unknown as Record<string,GraphValue>}}
superstructureDefinition.engineeringInspector!.parameterOrder = ['deckWidth', 'girderCount', 'girderSpacing', 'deckSlabThickness', 'deckConcrete']
function pierNode(pierType: import('../domain/types').PierCandidate['pierType'], label: string, dimensions: { key: string; label: string; port: string; defaultValue: number }[]): NodeDefinition {
  const inputs: NodePortDefinition[] = [...dimensions.map(item => ({ id: item.port, label: item.label, type: 'length[]' as const, quantityKind: 'length' as const })), { id: 'height', label: 'Height', type: 'length[]' as const, quantityKind: 'length' as const }, { id: 'material', label: 'Material', type: 'concreteMaterial', domainType: 'ConcreteMaterial' }, { id: 'columns', label: 'Columns', type: 'integer', description: 'Number of physical columns forming the pier at this support axis. Supported values: 1 or 2.' }]
  const parameterSchema: ParameterDescriptor[] = [...dimensions.flatMap(item => [{ key: `${item.key}Value`, label: `${item.label} local default`, dataType: 'number' as const, min: 0, step: .01, inputPortId: item.port }, { key: `${item.key}Unit`, label: `${item.label} unit`, dataType: 'select' as const, options: lengthOptions, inputPortId: item.port }]), { key: 'heightValue', label: 'Height local default', dataType: 'number', min: 0, step: .01, inputPortId: 'height' }, { key: 'heightUnit', label: 'Height unit', dataType: 'select', options: lengthOptions, inputPortId: 'height' }, { key: 'materialId', label: 'Material local default', dataType: 'select', options: classOptions, inputPortId: 'material' }, { key: 'columns', label: 'Columns local default', dataType: 'integer', min: 1, step: 1, inputPortId: 'columns' }]
  return {
    type: `substructure.pier.${pierType.toLowerCase()}`, label, category: 'STRUCTURAL_FAMILY', description: `Generate deterministic ${label} geometry candidates from local values and connected design ranges.`, inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'pierCandidate[]' }], parameterSchema, engineeringInspector: { schematic: 'pier', parameterOrder: [...dimensions.map(item => item.port), 'height', 'material', 'columns'] },
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
    type: `substructure.pier-cap.${capType.toLowerCase()}`, label, category: 'STRUCTURAL_FAMILY', description: `Generate deterministic ${label} family candidates from local values and connected design ranges.`, inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'pierCapCandidate[]' }], parameterSchema, engineeringInspector: { schematic: 'pier-cap', parameterOrder: [...dimensions.map(item => item.key), 'material'] },
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
    inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'foundationCandidate[]' }], parameterSchema, engineeringInspector: { schematic: 'foundation', parameterOrder: [...fields.map(field => field.key), 'material'] },
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
function elastomericBearingNode(): NodeDefinition {
  const fields = BEARING_FIELDS
  const inputs: NodePortDefinition[] = fields.map(field => ({ id: field.key, label: field.label, type: field.kind === 'length' ? 'length[]' : 'quantity[]', quantityKind: field.kind, group: field.group }))
  const parameterSchema: ParameterDescriptor[] = fields.flatMap(field => [
    { key: `${field.key}Value`, label: `${field.label} local default`, dataType: 'number' as const, step: .01, inputPortId: field.key },
    { key: `${field.key}Unit`, label: `${field.label} unit`, dataType: 'select' as const, options: unitsForKind(field.kind).map(unit => ({ value: unit.id, label: unit.label })), inputPortId: field.key },
  ])
  return {
    type: 'substructure.bearing.elastomeric', label: 'Elastomeric Bearing', category: 'STRUCTURAL_FAMILY',
    description: 'Generate reusable elastomeric bearing geometry and local-axis stiffness alternatives. No EN 1337 checks or bearing assignments are performed.',
    inputs, outputs: [{ id: 'candidates', label: 'Candidates', type: 'bearingCandidate[]' }], parameterSchema, engineeringInspector: { schematic: 'bearing', parameterOrder: fields.map(field => field.key) },
    createDefaultParameters: projectUnits => Object.fromEntries(fields.flatMap(field => {
      const unit = defaultUnit(field.kind, projectUnits)
      return [[`${field.key}Value`, Number(quantityFromCanonical(field.defaultValue, field.kind, unit).toPrecision(12))], [`${field.key}Unit`, unit]]
    })),
    validateParameters: parameters => fields.flatMap(field => [
      ...numberParameter(parameters, `${field.key}Value`),
      ...(typeof parameters[`${field.key}Unit`] === 'string' && unitsForKind(field.kind).some(unit => unit.id === parameters[`${field.key}Unit`]) ? [] : [`${field.label} requires a valid ${field.kind} unit.`]),
    ]),
    executor: ({ node, inputs }) => {
      const resolved = Object.fromEntries(fields.map(field => [field.key, (inputs[field.key] ?? makeQuantity(node.parameters[`${field.key}Value`] as number, field.kind, node.parameters[`${field.key}Unit`] as UnitId)) as GraphValue])) as Record<string, GraphValue>
      const generated = generateElastomericBearingCandidates(resolved as unknown as Parameters<typeof generateElastomericBearingCandidates>[0])
      return { candidates: generated.candidates as GraphValue, generatedCombinations: generated.generatedCombinations, invalidCombinations: generated.invalidCombinations }
    },
  }
}
const noParameters=(p:Record<string,GraphParameterValue>)=>Object.keys(p).length?['This node does not accept parameters.']:[]
function numberParameter(p:Record<string,GraphParameterValue>,key:string,integer=false):string[]{const v=p[key];return typeof v!=='number'||!Number.isFinite(v)||(integer&&!Number.isInteger(v))?[`${key} must be a valid ${integer?'integer':'number'}.`]:[]}
const lengthNode:NodeDefinition={type:'input.length',label:'Length',category:'MATH',description:'Provide a physical length in the project Length unit.',inputs:[],outputs:[{id:'value',label:'Length',type:'quantity[]',quantityKind:'length'}],parameterSchema:[{key:'mode',label:'Mode',dataType:'select',options:[{value:'single',label:'Single'},{value:'range',label:'Range'}]},{key:'value',label:'Value',dataType:'number',step:.01},{key:'min',label:'Min',dataType:'number',step:.01},{key:'max',label:'Max',dataType:'number',step:.01},{key:'step',label:'Delta',dataType:'number',step:.01}],createDefaultParameters:()=>({mode:'single',value:1,min:1,max:2,step:.5}),validateParameters:p=>String(p.mode??'single')==='single'?numberParameter(p,'value'):[...numberParameter(p,'min'),...numberParameter(p,'max'),...numberParameter(p,'step'),...(typeof p.step==='number'&&p.step<=0?['Delta must be greater than zero.']:[])],executor:({node})=>{const make=(value:number)=>makeQuantity(value,'length','m'),mode=String(node.parameters.mode??'single');if(mode==='single')return{value:[make(Number(node.parameters.value))]};const min=Number(node.parameters.min),max=Number(node.parameters.max),step=Number(node.parameters.step);if(!Number.isFinite(min)||!Number.isFinite(max)||!Number.isFinite(step)||step<=0||max<min)throw new Error('Length range requires finite Min, Max and positive Delta.');return{value:Array.from({length:Math.floor((max-min)/step+1e-10)+1},(_,i)=>make(Number((min+i*step).toFixed(10))))}}}
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
function materialNode(type:string,label:string,domainType:MaterialValue['domainType'],options:readonly {value:string;label:string}[]=[]):NodeDefinition{return{type,label,category:'MATERIALS',description:`Create a typed ${label} material reference from configured project data.`,inputs:[],outputs:[{id:'material',label, type:domainType==='ConcreteMaterial'?'concreteMaterial':domainType==='ReinforcementMaterial'?'reinforcementMaterial':domainType==='PrestressingSteelMaterial'?'prestressingSteelMaterial':'structuralSteelMaterial',domainType}],parameterSchema:[{key:'materialId',label:'Material',dataType:'select',options}],createDefaultParameters:()=>({materialId:options.find(option=>option.value==='C40/50')?.value??options.find(option=>option.value==='S355')?.value??options[0]?.value??''}),validateParameters:p=>typeof p.materialId!=='string'||!options.some(o=>o.value===p.materialId)?[options.length?'Select a supported material.':`${label} catalog data are not configured in SPANOVA.`]:[],executor:async({node,services})=>{const id=node.parameters.materialId as string;if(!options.some(o=>o.value===id))throw new Error(`Unknown ${label} material ID: ${id}.`);if(domainType==='ConcreteMaterial'&&services?.resolveConcreteMaterial)return{material:await services.resolveConcreteMaterial(id)};if(domainType==='StructuralSteelMaterial')return{material:{domainType,id,name:id,properties:{elasticModulus:makeQuantity(210000,'stress','MPa'),poissonRatio:makeQuantity(.3,'dimensionless','1'),density:makeQuantity(7.85,'density','t/m3'),unitWeight:makeQuantity(76.98,'unitWeight','kN/m3')}}};return{material:{domainType,id,name:id,properties:{}}}}}}
const assemblyDefinition: NodeDefinition = { type: 'structural.assembly', label: 'Assembly', category: 'BRIDGE', description: 'Assemble spans, supports and superstructure into a bridge arrangement.', inputs: [
  { id: 'spans', label: 'Span Arrangement', type: 'length[]', quantityKind: 'length', required: true },
  { id: 'superstructure', label: 'Superstructure', type: 'superstructureCandidate[]', required: true },
  { id: 'pier', label: 'Pier Family', type: 'pierCandidate[]' },
  { id: 'pierCap', label: 'Pier Cap Family', type: 'pierCapCandidate[]' },
  { id: 'bearing', label: 'Bearing Family', type: 'bearingCandidate[]' },
  { id: 'foundation', label: 'Foundation Family', type: 'foundationCandidate[]' },
  { id: 'abutmentA1', label: 'A1 Abutment', type: 'abutmentCandidate[]' },
  { id: 'abutmentA2', label: 'A2 Abutment', type: 'abutmentCandidate[]' },
  { id: 'alignment', label: 'Alignment', type: 'alignment' },
], outputs: [{ id: 'assembly', label: 'Bridge Assembly', type: 'bridgeAssembly' }], parameterSchema: [], createDefaultParameters: () => ({}), validateParameters: noParameters, executor: ({ inputs }) => {
  const spans = Array.isArray(inputs.spans) ? inputs.spans.filter(item => typeof item === 'number' || (typeof item === 'object' && item !== null && 'quantityKind' in item)) as never[] : []
  const first = (key: 'superstructure' | 'pier' | 'pierCap' | 'bearing' | 'foundation' | 'abutmentA1' | 'abutmentA2') => { const value = inputs[key]; return Array.isArray(value) ? value[0] : undefined }
  const selected = first('superstructure')
  const alignment = inputs.alignment as import('../domain/bridgeAssembly').AssemblyAlignment | undefined
  const assembly = resolveBridgeAssembly(spans, typeof selected === 'object' && selected !== null && 'id' in selected ? String(selected.id) : undefined, {
    superstructure: selected as import('../domain/superstructureCandidates').SuperstructureCandidate | undefined,
    pier: first('pier') as import('../domain/types').PierCandidate | undefined,
    pierCap: first('pierCap') as import('../domain/types').PierCapCandidate | undefined,
    bearing: first('bearing') as import('../domain/types').BearingCandidate | undefined,
    foundation: first('foundation') as import('../domain/types').FoundationCandidate | undefined,
    abutmentA1: first('abutmentA1') as import('../domain/abutmentCandidates').AbutmentCandidate | undefined,
    abutmentA2: first('abutmentA2') as import('../domain/abutmentCandidates').AbutmentCandidate | undefined,
  }, alignment)
  return { assembly }
} }
const definitions:NodeDefinition[]=[
 lengthNode,scalarDefinition('input.number','Number','number'),scalarDefinition('input.integer','Integer','integer'),scalarDefinition('input.boolean','Boolean','boolean'),
 {type:'input.integer-list',label:'Integer List',category:'INPUT',description:'Provide explicit integer design alternatives as a comma-separated list.',inputs:[],outputs:[{id:'values',label:'Values',type:'integer[]'}],parameterSchema:[{key:'valuesText',label:'Values',dataType:'string'}],createDefaultParameters:()=>({valuesText:'3, 4'}),validateParameters:p=>{const parsed=parseIntegerList(String(p.valuesText??''));return parsed.error?[parsed.error]:[]},executor:({node})=>({values:parseIntegerList(String(node.parameters.valuesText??'')).values})},
 {type:'input.quantity',label:'Quantity',category:'INPUT',description:'Provide a unit-aware engineering quantity.',inputs:[],outputs:[{id:'value',label:'Value',type:'quantity'}],parameterSchema:[{key:'value',label:'Value',dataType:'number',step:.01},{key:'quantityKind',label:'Quantity Kind',dataType:'select',options:[{value:'length',label:'Length'},{value:'area',label:'Area'},{value:'volume',label:'Volume'},{value:'angle',label:'Angle'},{value:'force',label:'Force'},{value:'moment',label:'Moment'},{value:'stress',label:'Stress'},{value:'mass',label:'Mass'},{value:'density',label:'Density'},{value:'unitWeight',label:'Unit Weight'},{value:'temperature',label:'Temperature'},{value:'temperatureDifference',label:'Temperature Difference'},{value:'acceleration',label:'Acceleration'},{value:'translationalStiffness',label:'Translational Stiffness'},{value:'rotationalStiffness',label:'Rotational Stiffness'},{value:'dimensionless',label:'Dimensionless'}]},
  {key:'unit',label:'Unit',dataType:'select',options:[] }],createDefaultParameters:(prefs)=>{const kind='length';return{value:1,quantityKind:kind,unit:defaultUnit(kind,prefs)}},validateParameters:p=>quantityErrors(p,false),executor:({node})=>({value:makeQuantity(node.parameters.value as number,node.parameters.quantityKind as QuantityKind,node.parameters.unit as UnitId)})},
 {type:'input.range',label:'Range',category:'INPUT',description:'Generate inclusive, stepped numeric or quantity values from scalar Start, End and Step inputs.',inputs:[{id:'start',label:'Start',type:'numeric'},{id:'end',label:'End',type:'numeric'},{id:'increment',label:'Step',type:'numeric'}],outputs:[{id:'values',label:'Values',type:'numeric[]'}],parameterSchema:[{key:'min',label:'Start',dataType:'number',step:.01,inputPortId:'start'},{key:'max',label:'End',dataType:'number',step:.01,inputPortId:'end'},{key:'step',label:'Step',dataType:'number',step:.01,inputPortId:'increment'},{key:'quantityKind',label:'Quantity Kind',dataType:'select',options:[{value:'dimensionless',label:'Dimensionless'},{value:'length',label:'Length'},{value:'area',label:'Area'},{value:'volume',label:'Volume'},{value:'angle',label:'Angle'},{value:'force',label:'Force'},{value:'moment',label:'Moment'},{value:'stress',label:'Stress'},{value:'mass',label:'Mass'},{value:'density',label:'Density'},{value:'unitWeight',label:'Unit Weight'},{value:'temperature',label:'Temperature'},{value:'temperatureDifference',label:'Temperature Difference'},{value:'acceleration',label:'Acceleration'},{value:'translationalStiffness',label:'Translational Stiffness'},{value:'rotationalStiffness',label:'Rotational Stiffness'}]},{key:'unit',label:'Unit',dataType:'select',options:[]}],createDefaultParameters:prefs=>({min:0,max:10,step:1,quantityKind:'dimensionless',unit:defaultUnit('dimensionless',prefs)}),validateParameters:p=>[...numberParameter(p,'min'),...numberParameter(p,'max'),...numberParameter(p,'step'),...(typeof p.step==='number'&&p.step===0?['Step must not be zero.']:[]),...(typeof p.min==='number'&&typeof p.max==='number'&&typeof p.step==='number'&&((p.step>0&&p.max<p.min)||(p.step<0&&p.max>p.min))?['Step direction must move from Start toward End.']:[]),...quantityErrors(p,true),...(typeof p.min==='number'&&typeof p.max==='number'&&typeof p.step==='number'&&p.step!==0&&Math.floor((p.max-p.min)/p.step+1e-10)>9999?['Range exceeds the 10,000 value execution limit.']:[])],executor:({node,inputs})=>({values:generateRangeValues(node,inputs)})},
 math('math.add','Add','add'),math('math.subtract','Subtract','subtract'),math('math.multiply','Multiply','multiply'),math('math.divide','Divide','divide'),
 materialNode('material.concrete','Concrete','ConcreteMaterial',classOptions),materialNode('material.reinforcement','Reinforcement Steel','ReinforcementMaterial'),materialNode('material.prestressing','Prestressing Steel','PrestressingSteelMaterial'),materialNode('material.structuralSteel','Structural Steel','StructuralSteelMaterial',STRUCTURAL_STEEL_OPTIONS),
 ...pierDefinitions,
 ...pierCapDefinitions,
 ...foundationDefinitions,
 ...girderDefinitions, superstructureDefinition, abutmentDefinition, assemblyDefinition,
 elastomericBearingDefinition,
 {type:'output.watch',label:'Watch',category:'OUTPUT',description:'Inspect an arbitrary graph value for debugging.',inputs:[{id:'value',label:'Value',type:'display:any',required:true}],outputs:[],parameterSchema:[],createDefaultParameters:()=>({}),validateParameters:noParameters,executor:({inputs})=>({value:inputs.value})},
 {type:'output.list',label:'List',category:'OUTPUT',description:'Display values and engineering alternatives as an indexed read-only list.',inputs:[{id:'items',label:'Items',type:'display:any',required:true}],outputs:[],parameterSchema:[],createDefaultParameters:()=>({}),validateParameters:noParameters,executor:({inputs})=>({value:inputs.items})},
]
function quantityErrors(p:Record<string,GraphParameterValue>,range:boolean):string[]{const kind=(p.quantityKind??'dimensionless') as QuantityKind;const unit=(p.unit??'1') as string;const u=getValidUnit(unit,kind);const errors:string[]=[];if(!UNIT_KINDS.includes(kind))errors.push('Select a valid quantity kind.');if(!u)errors.push(`Unit ${String(p.unit)} is invalid for ${String(kind)}.`);if(!range)errors.push(...numberParameter(p,'value'));return errors}
function rangeScalar(input:GraphValue|undefined,fallback:number,kind:QuantityKind,unit:UnitId):number {if(input===undefined)return fallback;if(typeof input==='number')return input;if(isQuantity(input)){if(input.quantityKind!==kind)throw new Error(`Range inputs must use ${kind} quantities.`);return quantityFromCanonical(input.value,kind,unit)}throw new Error('Range Start, End and Step require scalar numeric inputs.')}
function getValidUnit(unit:string,kind:QuantityKind){return unitsForKind(kind).some(u=>u.id===unit)}
function defaultUnit(kind:string,prefs?:Record<string,string>){const prefKey:Record<string,string>={length:'length',force:'force',moment:'moment',stress:'stress',mass:'mass',temperature:'temperature',translationalStiffness:'translationalStiffness',rotationalStiffness:'rotationalStiffness'};const pref=prefs?.[prefKey[kind]??''];const match=unitsForKind(kind as QuantityKind).find(u=>u.label===pref||u.id===pref);const canonical=kind==='translationalStiffness'?'kN/m':kind==='rotationalStiffness'?'kNm/rad':undefined;return match?.id??(canonical&&unitsForKind(kind as QuantityKind).some(unit=>unit.id===canonical)?canonical:undefined)??unitsForKind(kind as QuantityKind)[0]?.id??'1'}
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
  if(node.type==='substructure.bearing.elastomeric'&&portId==='candidates'){
    const input=bearingInputValues(node,inputs)
    return generateElastomericBearingCandidates(input).candidates as GraphValue
  }
  if((node.type==='structural.girder.precast'||node.type==='structural.girder.steel')&&portId==='candidates'){
    const steel=node.type.endsWith('.steel'), fields=steel?['H','Btf','ttf','Bbf','tbf','tw']:['H','tf','bf','w','th1','th2','bh1','bh2']
    const geometry=Object.fromEntries(fields.map(key=>[key,inputs[key]??localLength(node.parameters[`${key}Value`] as number,node.parameters[`${key}Unit`] as UnitId)])) as Record<string,import('../domain/pierCandidates').LengthInput>
    const materialValue=inputs.material??node.parameters.materialId??(steel?'S355':'C40/50')
    const material=typeof materialValue==='string'?{domainType:steel?'StructuralSteelMaterial' as const:'ConcreteMaterial' as const,id:materialValue,name:materialValue,properties:{}}:materialValue as MaterialValue
    if(steel)return generateSteelGirderCandidates({H:geometry.H,Btf:geometry.Btf,ttf:geometry.ttf,Bbf:geometry.Bbf,tbf:geometry.tbf,tw:geometry.tw,material,familyId:String(node.parameters.familyId??'SG-01'),preferredSpan:Number(node.parameters.preferredSpanValue??60),minSpan:Number(node.parameters.minSpanValue??30),maxSpan:Number(node.parameters.maxSpanValue??90)}).candidates as unknown as GraphValue
    return generatePrecastGirderCandidates({geometry,material,familyId:String(node.parameters.familyId??'PG-200'),preferredSpan:Number(node.parameters.preferredSpanValue??40),minSpan:Number(node.parameters.minSpanValue??30),maxSpan:Number(node.parameters.maxSpanValue??90)}).candidates as unknown as GraphValue
  }
  if(node.type==='structural.superstructure'&&portId==='candidates'){
    const materialValue=inputs.deckConcrete??node.parameters.deckConcreteId??'C30/37'
    const deckConcrete=typeof materialValue==='string'?{domainType:'ConcreteMaterial' as const,id:materialValue,name:materialValue,properties:{}}:materialValue as MaterialValue
    const girder=resolveGirderCandidates(inputs.girder)
    if(!girder.length) return [] as unknown as GraphValue
    return generateSuperstructureCandidates({girders:girder as unknown as import('../domain/girderCandidates').GirderCandidate[],deckWidth:resolvedSuperstructureLength(inputs.deckWidth,localLength(Number(node.parameters.deckWidthValue),String(node.parameters.deckWidthUnit)),'Deck Width'),girderCount:(inputs.girderCount??node.parameters.girderCount) as never,girderSpacing:resolvedSuperstructureLength(inputs.girderSpacing,localLength(Number(node.parameters.girderSpacingValue),String(node.parameters.girderSpacingUnit)),'Girder Spacing'),deckSlabThickness:resolvedSuperstructureLength(inputs.deckSlabThickness,localLength(Number(node.parameters.deckSlabThicknessValue),String(node.parameters.deckSlabThicknessUnit)),'Deck Slab Thickness'),deckConcrete}).candidates as unknown as GraphValue
  }
  if(node.type==='structural.abutment'&&portId==='candidates'){
    const geometry=Object.fromEntries(['Back_wall_w','Bearing_sup_w','Front_w','Back_w','Front_fh','Foun_fh','Onp_Amp','found_d'].map(key=>[key,localLength(Number(node.parameters[`${key}Value`]),String(node.parameters[`${key}Unit`]))]))
    return generateAbutmentCandidates({geometry,seiU:localLength(Number(node.parameters.seiUValue),String(node.parameters.seiUUnit)),girder:inputs.girder,superstructure:inputs.superstructure,bearing:inputs.bearing}).candidates as unknown as GraphValue
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
export function previewBearingStatistics(node:SpanovaNode, inputs:Record<string,GraphValue>, validCandidates:number) {
  if(node.type!=='substructure.bearing.elastomeric')return undefined
  const values=bearingInputValues(node,inputs)
  const generatedCombinations=BEARING_FIELDS.reduce((count,field)=>count*countBearingValues(values[field.key as keyof typeof values],field.kind,field.label),1)
  return {generatedCombinations,invalidCombinations:generatedCombinations-validCandidates}
}
function bearingInputValues(node:SpanovaNode,inputs:Record<string,GraphValue>){
  return Object.fromEntries(BEARING_FIELDS.map(field=>[field.key,inputs[field.key]??makeQuantity(node.parameters[`${field.key}Value`] as number,field.kind,node.parameters[`${field.key}Unit`] as UnitId)])) as unknown as Parameters<typeof generateElastomericBearingCandidates>[0]
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
  if(target==='display:any')return ['number','integer','boolean','string','number[]','integer[]','numeric[]','quantity','quantity[]','length','length[]','concreteMaterial','reinforcementMaterial','prestressingSteelMaterial','structuralSteelMaterial','numeric','pierCandidate[]','pierCapCandidate[]','foundationCandidate[]','bearingCandidate[]','girderCandidate[]','superstructureCandidate[]'].includes(source)
  if(target==='numeric')return ['number','integer','quantity','numeric'].includes(source)
  if(target==='integer[]')return source==='integer'||source==='integer[]'||(['number[]','numeric','numeric[]'].includes(source)&&(sourceKind===undefined||sourceKind==='dimensionless'))
  const requiredKind=targetKind??(target==='length'||target==='length[]'?'length':undefined)
  if(requiredKind){
    const numericSource=source==='number'||source==='integer'||source==='numeric'||source==='number[]'||source==='integer[]'||source==='numeric[]'
    if(numericSource)return sourceKind===undefined||sourceKind===requiredKind
    const quantitySource=source==='quantity'||source==='quantity[]'||source==='length'||source==='length[]'
    return quantitySource&&sourceKind===requiredKind
  }
  if((target==='quantity'||target==='quantity[]')&&(source==='quantity'||source==='quantity[]')&&sourceKind&&targetKind)return sourceKind===targetKind
  if(source==='quantity'&&target==='quantity'&&sourceKind&&targetKind)return sourceKind===targetKind
  return source===target||(source==='integer'&&target==='number')
}











