import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_GRAPH_VIEW_PREFERENCES, readGraphViewPreferences, writeGraphViewPreferences } from './graphViewPreferences'

describe('Graph view preferences',()=>{
 beforeEach(()=>localStorage.clear())
 it('defaults new workspaces to smooth and restores the selected style',()=>{
  expect(readGraphViewPreferences()).toEqual(DEFAULT_GRAPH_VIEW_PREFERENCES)
  expect(writeGraphViewPreferences({connectionStyle:'orthogonal'})).toBe(true)
  expect(readGraphViewPreferences()).toEqual({connectionStyle:'orthogonal'})
 })
 it('falls back to Smooth when stored preferences are invalid',()=>{
  localStorage.setItem('spanova.graph.view-preferences.v1','not json')
  expect(readGraphViewPreferences()).toEqual(DEFAULT_GRAPH_VIEW_PREFERENCES)
 })
})
