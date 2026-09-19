export const QUANTITY_KINDS = ['dimensionless','length','area','volume','angle','force','moment','stress','mass','density','unitWeight','temperature','temperatureDifference','acceleration','translationalStiffness','rotationalStiffness'] as const
export type QuantityKind = typeof QUANTITY_KINDS[number]
export type UnitId = string
export interface UnitDefinition { id: UnitId; label: string; kind: QuantityKind; toCanonical: (value: number) => number; fromCanonical: (value: number) => number }
const linear = (id: string, label: string, kind: QuantityKind, factor: number): UnitDefinition => ({ id, label, kind, toCanonical: (v) => v * factor, fromCanonical: (v) => v / factor })
const units: UnitDefinition[] = [
  linear('1','-','dimensionless',1), linear('mm','mm','length',.001), linear('cm','cm','length',.01), linear('m','m','length',1),
  linear('mm2','mm²','area',1e-6), linear('cm2','cm²','area',1e-4), linear('m2','m²','area',1), linear('mm3','mm³','volume',1e-9), linear('cm3','cm³','volume',1e-6), linear('m3','m³','volume',1),
  { id:'deg',label:'deg',kind:'angle',toCanonical:v=>v*Math.PI/180,fromCanonical:v=>v*180/Math.PI }, linear('rad','rad','angle',1),
  linear('N','N','force',.001), linear('kN','kN','force',1), linear('MN','MN','force',1000), linear('Nm','Nm','moment',.001), linear('kNm','kN·m','moment',1), linear('MNm','MN·m','moment',1000),
  linear('Pa','Pa','stress',1e-6), linear('kPa','kPa','stress',.001), linear('MPa','MPa','stress',1), linear('GPa','GPa','stress',1000), linear('kg','kg','mass',.001), linear('t','t','mass',1),
  linear('kg/m3','kg/m³','density',.001), linear('t/m3','t/m³','density',1), linear('N/m3','N/m³','unitWeight',.001), linear('kN/m3','kN/m³','unitWeight',1),
  linear('C','°C','temperature',1), {id:'K',label:'K',kind:'temperature',toCanonical:v=>v-273.15,fromCanonical:v=>v+273.15}, linear('deltaC','°C','temperatureDifference',1), linear('deltaK','K','temperatureDifference',1),
  linear('m/s2','m/s²','acceleration',1), linear('g','g','acceleration',9.80665), linear('N/m','N/m','translationalStiffness',.001), linear('kN/m','kN/m','translationalStiffness',1), linear('MN/m','MN/m','translationalStiffness',1000),
  linear('Nm/rad','Nm/rad','rotationalStiffness',.001), linear('kNm/rad','kN·m/rad','rotationalStiffness',1), linear('MNm/rad','MN·m/rad','rotationalStiffness',1000),
]
export const UNIT_REGISTRY: readonly UnitDefinition[] = units
export function unitsForKind(kind: QuantityKind) { return units.filter((unit) => unit.kind === kind) }
export function getUnit(id: UnitId) { return units.find((unit) => unit.id === id) }
export function makeQuantity(value: number, quantityKind: QuantityKind, unit: UnitId): EngineeringQuantity {
  if (!Number.isFinite(value)) throw new Error('Quantity value must be finite.')
  const definition = getUnit(unit)
  if (!definition || definition.kind !== quantityKind) throw new Error(`Unit ${unit} is invalid for ${quantityKind}.`)
  return { value: definition.toCanonical(value), quantityKind, unit }
}
export interface EngineeringQuantity { readonly value: number; readonly quantityKind: QuantityKind; readonly unit: UnitId }
export function convertQuantity(value: number, fromUnit: UnitId, toUnit: UnitId) {
  const from = getUnit(fromUnit), to = getUnit(toUnit)
  if (!from || !to || from.kind !== to.kind) throw new Error(`Cannot convert ${fromUnit} to ${toUnit}.`)
  // Remove binary floating point presentation noise without reducing the
  // canonical engineering precision used by calculations.
  return Number(to.fromCanonical(from.toCanonical(value)).toPrecision(15))
}
export function quantityFromCanonical(value: number, quantityKind: QuantityKind, unit: UnitId) {
  const definition = getUnit(unit)
  if (!definition || definition.kind !== quantityKind) throw new Error(`Unit ${unit} is invalid for ${quantityKind}.`)
  return definition.fromCanonical(value)
}
export function formatQuantity(quantity: EngineeringQuantity, unit: UnitId = quantity.unit, digits = 2) {
  const value = quantityFromCanonical(quantity.value, quantity.quantityKind, unit)
  return `${value.toFixed(digits)} ${getUnit(unit)!.label}`
}
export function formatQuantityList(values: readonly EngineeringQuantity[], digits = 2) { if(!values.length)return '[]';const first=values[0];if(values.some(value=>value.quantityKind!==first.quantityKind||value.unit!==first.unit))return `[${values.map(value=>formatQuantity(value,undefined,digits)).join(', ')}]`;return `[${values.map(value=>quantityFromCanonical(value.value,first.quantityKind,first.unit).toFixed(digits)).join(', ')}] ${getUnit(first.unit)!.label}` }
export const CANONICAL_UNITS: Record<QuantityKind, UnitId> = { dimensionless:'1',length:'m',area:'m2',volume:'m3',angle:'rad',force:'kN',moment:'kNm',stress:'MPa',mass:'t',density:'t/m3',unitWeight:'kN/m3',temperature:'C',temperatureDifference:'deltaC',acceleration:'m/s2',translationalStiffness:'kN/m',rotationalStiffness:'kNm/rad' }
