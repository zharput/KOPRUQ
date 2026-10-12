import { describe, expect, it } from 'vitest'
import { buildExecutionDisplay } from './executionDisplay'

const run = { states: { a: 'success' as const }, errors: { b: 'boom' }, resolvedInputs: { a: { x: 1 } }, outputs: { a: { value: 2 } } }

describe('execution display', () => {
  it('hides states, errors, resolved inputs and outputs of the previous run while the graph is dirty', () => {
    expect(buildExecutionDisplay(true, run)).toEqual({ states: {}, errors: {}, resolvedInputs: {}, outputs: {} })
  })
  it('passes the last run through when the graph is unchanged', () => {
    expect(buildExecutionDisplay(false, run)).toEqual(run)
  })
})
