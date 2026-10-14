import { z } from 'zod'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import type { PreferredSpanRule } from './types'

/**
 * Wire mapping of the preferred span rules (`PUT /preferred-span-rules`). Source of the shape: backend `PreferredSpanRuleDto`
 * (every field required; spans are metres, unchanged). `superstructureType` and `source` are plain strings on the wire,
 * as in the existing module schema, and are cast back to the TypeScript types on read (no further validation).
 */
const preferredSpanRuleWire = z.object({
  id: z.string(), superstructureType: z.string(), girderVariantId: z.string(), minSpan: z.number(), maxSpan: z.number(), spanDelta: z.number(),
  primarySpan: z.number(), enabled: z.boolean(), source: z.string(),
}).strict()

export const preferredSpanRulesWireSchema = z.array(preferredSpanRuleWire)
export type PreferredSpanRuleWire = z.infer<typeof preferredSpanRuleWire>

export function preferredSpanRulesToWire(rules: PreferredSpanRule[]): PreferredSpanRuleWire[] {
  return rules.map((r) => ({
    id: r.id, superstructureType: r.superstructureType, girderVariantId: r.girderVariantId, minSpan: r.minSpan, maxSpan: r.maxSpan, spanDelta: r.spanDelta,
    primarySpan: r.primarySpan, enabled: r.enabled, source: r.source,
  }))
}
export function preferredSpanRulesFromWire(wire: PreferredSpanRuleWire[]): PreferredSpanRule[] {
  return wire.map((w) => ({
    id: w.id, superstructureType: w.superstructureType as PreferredSpanRule['superstructureType'], girderVariantId: w.girderVariantId, minSpan: w.minSpan,
    maxSpan: w.maxSpan, spanDelta: w.spanDelta, primarySpan: w.primarySpan, enabled: w.enabled, source: w.source as PreferredSpanRule['source'],
  }))
}

export const PREFERRED_SPAN_RULES_SECTION: SectionDefinition<PreferredSpanRule[], PreferredSpanRuleWire[]> = {
  id: 'preferredSpanRules', path: 'preferred-span-rules',
  codec: { schema: preferredSpanRulesWireSchema.nullable(), clearable: true, toWire: preferredSpanRulesToWire, fromWire: (wire) => wire === null ? undefined : preferredSpanRulesFromWire(wire) },
}
