import type { MaterialValue } from '../domain/types'
import { makeQuantity, type QuantityKind } from '../domain/quantities'
import type { GraphExecutionServices } from '../registry/nodeRegistry'

const API_BASE='http://localhost:8080'
const CONCRETE_PROPERTY_KINDS:Record<string,QuantityKind>={fck:'stress',fcm:'stress',Ecm:'stress',unitWeight:'unitWeight',density:'density',poissonRatioUncracked:'dimensionless'}
export const graphMaterialServices:GraphExecutionServices={
  async resolveConcreteMaterial(materialId){
    const response=await fetch(`${API_BASE}/api/materials/concrete?materialId=${encodeURIComponent(materialId)}`)
    if(!response.ok)throw new Error(response.status===404?`Unknown concrete material ID: ${materialId}.`:`Concrete material lookup failed (${response.status}).`)
    const dto=await response.json() as {domainType:MaterialValue['domainType'];id:string;name:string;properties:Record<string,{value:number;unit:string}>}
    if(dto.domainType!=='ConcreteMaterial'||dto.id!==materialId)throw new Error('Concrete material API returned an invalid identity.')
    const properties=Object.fromEntries(Object.entries(dto.properties).map(([key,item])=>{
      const kind=CONCRETE_PROPERTY_KINDS[key]
      if(!kind)throw new Error(`Unsupported concrete property returned by API: ${key}.`)
      return [key,makeQuantity(item.value,kind,item.unit==='-'?'1':item.unit)]
    }))
    return {domainType:dto.domainType,id:dto.id,name:dto.name,properties}
  },
}
