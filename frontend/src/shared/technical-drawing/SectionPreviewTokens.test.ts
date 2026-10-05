import { describe, expect, it } from 'vitest'
import { referenceSectionScale, structuralSectionScale, STRUCTURAL_ENGINEERING_TO_SVG_SCALE } from './SectionPreviewTokens'
describe('referenceSectionScale', () => { it('keeps candidate ratios stable against a shared envelope', () => { const scale = referenceSectionScale({ width: 3, height: 3 }, { width: 300, height: 270 }); expect(1.5 * scale / (3 * scale)).toBeCloseTo(.5) }) })
it('exposes the central 75 percent height rule', async () => { const { SECTION_PREVIEW_TOKENS } = await import('./SectionPreviewTokens'); expect(SECTION_PREVIEW_TOKENS.maxHeightRatio).toBe(.75) })
it('maps every engineering family through one global scale', () => { const scale = structuralSectionScale({ width: 3, height: 10 }, { width: 900, height: 700 }); expect(scale).toBe(STRUCTURAL_ENGINEERING_TO_SVG_SCALE); expect(3 * scale).toBe(120); expect((3 * scale) / (10 * scale)).toBeCloseTo(.3) })
