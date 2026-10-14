import { describe, expect, it } from 'vitest'
import { parseProjectData } from '../../../shared/project-store/projectDataValidation'
import { PREFERRED_SPAN_RULES_SECTION, preferredSpanRulesFromWire, preferredSpanRulesToWire, preferredSpanRulesWireSchema } from './preferredSpanWire'
import type { PreferredSpanRule } from './types'

const RULES: PreferredSpanRule[] = [
  { id: 'girder-span-PG-H160', superstructureType: 'PRECAST_GIRDER', girderVariantId: 'PG-H160', minSpan: 20, maxSpan: 30, spanDelta: 5, primarySpan: 25, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' },
  { id: 'girder-span-SG', superstructureType: 'STEEL_GIRDER', girderVariantId: 'SG-1', minSpan: 45, maxSpan: 90, spanDelta: 5, primarySpan: 60, enabled: false, source: 'PROJECT_DESIGN_SYSTEM' },
]

describe('preferred span wire mapping', () => {
  it('round-trips and keeps the backend key order, dropping passthrough fields', () => {
    const wire = preferredSpanRulesToWire(RULES.map((r) => ({ ...r, extra: 1 })))
    expect(Object.keys(wire[0])).toEqual(['id', 'superstructureType', 'girderVariantId', 'minSpan', 'maxSpan', 'spanDelta', 'primarySpan', 'enabled', 'source'])
    expect(parseProjectData(preferredSpanRulesWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(preferredSpanRulesFromWire(wire)).toEqual(RULES)
  })
  it('keeps null and [] apart', () => {
    const codec = PREFERRED_SPAN_RULES_SECTION.codec
    expect(codec.fromWire(null)).toBeUndefined(); expect(codec.fromWire([])).toEqual([]); expect(codec.toWire([])).toEqual([])
    expect(PREFERRED_SPAN_RULES_SECTION).toMatchObject({ path: 'preferred-span-rules', codec: { clearable: true } })
  })
  it('rejects unknown keys and wrong types with the full path; accepts an unknown superstructure string as today', () => {
    const wire = JSON.parse(JSON.stringify(preferredSpanRulesToWire(RULES)))
    wire[1].superstructureType = 'SOMETHING'
    expect(parseProjectData(preferredSpanRulesWireSchema, wire, 'preferredSpanRules')).toHaveLength(2)
    wire[1].minSpan = '45'
    expect(() => parseProjectData(preferredSpanRulesWireSchema, wire, 'preferredSpanRules')).toThrow('preferredSpanRules[1].minSpan')
    wire[1].minSpan = 45; wire[0].extra = true
    expect(() => parseProjectData(preferredSpanRulesWireSchema, wire, 'preferredSpanRules')).toThrow('preferredSpanRules[0]')
  })
})
