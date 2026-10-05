import { describe, expect, it } from 'vitest'
import { computeCircularSectionProperties } from './circularSectionProperties'
describe('computeCircularSectionProperties', () => { it('calculates the known D=2 m section', () => { const p = computeCircularSectionProperties(2); expect(p.area).toBeCloseTo(Math.PI, 10); expect(p.ix).toBeCloseTo(Math.PI / 4, 10); expect(p.iy).toBe(p.ix); expect(p.wx).toBeCloseTo(Math.PI / 4, 10); expect(p.wy).toBe(p.wx) }) })
