import { z } from 'zod'
import { createProjectModule } from '../../../shared/project-file/projectModuleStore'
import type { PreferredSpanRule } from './types'

const number = z.number()
const preferredSpanRulesSchema = z.array(z.object({ id: z.string(), superstructureType: z.string(), girderVariantId: z.string(), minSpan: number, maxSpan: number, spanDelta: number, primarySpan: number, enabled: z.boolean(), source: z.string() }).passthrough()) as unknown as z.ZodType<PreferredSpanRule[]>

export const PREFERRED_SPAN_RULES_MODULE = createProjectModule('preferredSpanRules', 'kopruq.project-design-system.girder-span-rules', preferredSpanRulesSchema)
