import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseProjectData, ProjectDataValidationError, WireMappingError } from './projectDataValidation'

const schema = z.object({ workspace: z.object({ bridges: z.array(z.object({ spansM: z.array(z.number()) })) }) })

describe('project data validation', () => {
  it('returns the parsed value when it is valid', () => {
    const value = { workspace: { bridges: [{ spansM: [30] }] } }
    expect(parseProjectData(schema, value, '')).toEqual(value)
  })
  it('formats the path and message exactly', () => {
    const error = (() => { try { parseProjectData(schema, { workspace: { bridges: [{ spansM: ['x'] }] } }, '') } catch (e) { return e as ProjectDataValidationError } })()!
    expect(error).toBeInstanceOf(ProjectDataValidationError)
    expect(error.message).toBe('Invalid project data: workspace.bridges[0].spansM[0] - Expected number, received string')
    expect(error.path).toBe('workspace.bridges[0].spansM[0]'); expect(error.issues).toHaveLength(1)
  })
  it('prefixes the path', () => {
    expect(() => parseProjectData(z.object({ a: z.number() }), { a: 'x' }, 'value')).toThrow('Invalid project data: value.a - Expected number, received string')
  })
  it('lists only the first 3 issues and counts the rest', () => {
    const error = (() => { try { parseProjectData(z.object({ a: z.number(), b: z.number(), c: z.number(), d: z.number(), e: z.number() }), {}, '') } catch (e) { return e as ProjectDataValidationError } })()!
    expect(error.issues).toHaveLength(5)
    expect(error.message).toBe('Invalid project data: a - Required; b - Required; c - Required (+2 more)')
  })
  it('writes (root) for an empty path', () => {
    expect(() => parseProjectData(z.object({}), 'nope', '')).toThrow('Invalid project data: (root) - Expected object, received string')
  })
  it('WireMappingError has the documented message and path', () => {
    const error = new WireMappingError('bridges[0].id', 'must not be empty')
    expect(error.message).toBe('Cannot send project data: bridges[0].id - must not be empty'); expect(error.path).toBe('bridges[0].id')
    expect(new WireMappingError('', 'x').message).toBe('Cannot send project data: (root) - x')
  })
})
