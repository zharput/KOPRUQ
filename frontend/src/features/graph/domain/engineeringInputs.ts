import { makeQuantity, type QuantityKind, type UnitId, unitsForKind } from './quantities'
import type { EngineeringQuantity } from './quantities'
import type { GraphPortType, GraphValue } from './types'

export interface EngineeringInputTarget { readonly type: GraphPortType; readonly quantityKind?: QuantityKind }
export type ProjectUnitPreferences = Partial<Record<QuantityKind, string>>

/** Resolve raw numeric values at a typed engineering input boundary. Explicit quantities keep their own units. */
export function resolveEngineeringInput(value: GraphValue, target: EngineeringInputTarget, projectUnits: ProjectUnitPreferences = {}): GraphValue {
  const kind = target.quantityKind ?? (target.type === 'length' || target.type === 'length[]' ? 'length' : undefined)
  if (!kind) return value
  const unit = resolveUnit(kind, projectUnits[kind])
  // An integer is still represented as a number at runtime; the port type
  // ensures this conversion only occurs at an explicitly typed quantity target.
  if (typeof value === 'number') return makeQuantity(value, kind, unit)
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'number') return makeQuantity(item, kind, unit)
      if (isEngineeringQuantity(item)) {
        if (item.quantityKind !== kind) throw new Error(`Cannot use ${item.quantityKind} values at a ${kind} input.`)
        return item
      }
      throw new Error(`Input requires numeric or ${kind} quantity values.`)
    })
  }
  if (isEngineeringQuantity(value)) {
    if (value.quantityKind !== kind) throw new Error(`Cannot use ${value.quantityKind} at a ${kind} input.`)
    return value
  }
  return value
}

function resolveUnit(kind: QuantityKind, preferred?: string): UnitId {
  return unitsForKind(kind).find((unit) => unit.id === preferred || unit.label === preferred)?.id ?? unitsForKind(kind)[0].id
}

function isEngineeringQuantity(value: unknown): value is EngineeringQuantity {
  return typeof value === 'object' && value !== null && 'quantityKind' in value && 'value' in value && 'unit' in value
}
