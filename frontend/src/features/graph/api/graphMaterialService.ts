import type { MaterialValue } from '../domain/types'
import { makeQuantity, type QuantityKind } from '../domain/quantities'
import type { GraphExecutionServices } from '../registry/nodeRegistry'
import { ApiError, requestJson } from '../../../shared/api/http'

const NOT_FOUND = 404
const CONCRETE_PROPERTY_KINDS:Record<string,QuantityKind>={fck:'stress',fcm:'stress',Ecm:'stress',unitWeight:'unitWeight',density:'density',poissonRatioUncracked:'dimensionless'}
export const graphMaterialServices:GraphExecutionServices={
  async resolveConcreteMaterial(materialId){
    let dto:{domainType:MaterialValue['domainType'];id:string;name:string;properties:Record<string,{value:number;unit:string}>}
    try{dto=await requestJson(`/api/materials/concrete?materialId=${encodeURIComponent(materialId)}`)}
    catch(error){throw error instanceof ApiError&&error.status===NOT_FOUND?new Error(`Unknown concrete material ID: ${materialId}.`):error}
    if(dto.domainType!=='ConcreteMaterial'||dto.id!==materialId)throw new Error('Concrete material API returned an invalid identity.')
    const properties=Object.fromEntries(Object.entries(dto.properties).map(([key,item])=>{
      const kind=CONCRETE_PROPERTY_KINDS[key]
      if(!kind)throw new Error(`Unsupported concrete property returned by API: ${key}.`)
      return [key,makeQuantity(item.value,kind,item.unit==='-'?'1':item.unit)]
    }))
    return {domainType:dto.domainType,id:dto.id,name:dto.name,properties}
  },
}
