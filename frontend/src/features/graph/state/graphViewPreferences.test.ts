import { describe, expect, it } from 'vitest'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { openTestProject } from '../../../test/projectSessionTestUtils'
import { DEFAULT_GRAPH_VIEW_PREFERENCES, readGraphViewPreferences, writeGraphViewPreferences } from './graphViewPreferences'

describe('Graph view preferences',()=>{
 it('defaults new workspaces to smooth and keeps the selected style in memory',()=>{
  expect(readGraphViewPreferences()).toEqual(DEFAULT_GRAPH_VIEW_PREFERENCES)
  expect(writeGraphViewPreferences({connectionStyle:'orthogonal'})).toBe(true)
  expect(readGraphViewPreferences()).toEqual({connectionStyle:'orthogonal'})
 })
 it('falls back to Smooth for an unknown style',()=>{
  writeGraphViewPreferences({connectionStyle:'orthogonal'})
  writeGraphViewPreferences({connectionStyle:'diagonal' as never})
  expect(readGraphViewPreferences()).toEqual(DEFAULT_GRAPH_VIEW_PREFERENCES)
 })
 it('returns to the default when the project changes',()=>{
  writeGraphViewPreferences({connectionStyle:'orthogonal'})
  openTestProject(NEW_PROJECT_DOCUMENT_JSON)
  expect(readGraphViewPreferences()).toEqual(DEFAULT_GRAPH_VIEW_PREFERENCES)
 })
 it('is never written to the server',()=>{
  expect(writeGraphViewPreferences({connectionStyle:'orthogonal'})).toBe(true)
 })
})
