import { buildProjectFile, projectFileText } from './projectFileService'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { INITIAL_BRIDGES } from '../../features/project/model/types'
import { ensureBridgeDefinitions } from '../../features/bridge-definition/model/store'
import { createEmptyGraph, importGraphDocuments } from '../../features/graph/state/graphStore'

/** Test fixtures: a valid project file built from real defaults and a table of corruptions that must reject the whole file. */
export type Json = Record<string, any> // a corruptible JSON document; tests poke arbitrary paths
/** Builds a valid file from the real defaults, then lets a test corrupt it. */
export function goodFileJson(): Json {
  const bridges = INITIAL_BRIDGES.slice(0, 3).map((bridge, index) => ({ ...bridge, id: `bridge-${index}` }))
  const definitions = ensureBridgeDefinitions({ selectedBridgeId: null, definitions: {} }, bridges)
  definitions.definitions['VIA-02'] = { ...definitions.definitions['VIA-02'], spanLengthsM: [30, 35], axes: [{ id: 'A1', name: 'A1', type: 'ABUTMENT', chainageM: 0, elevationM: null, skewDegrees: null }, { id: 'P1', name: 'P1', type: 'PIER', chainageM: 30, elevationM: 1, skewDegrees: 0 }, { id: 'A2', name: 'A2', type: 'ABUTMENT', chainageM: 65, elevationM: null, skewDegrees: null }], constraints: [{ id: 'c1', kind: 'RIVER', name: 'River', startChainageM: 1, endChainageM: null, note: '' }] }
  const graph = createEmptyGraph('G'); graph.nodes.push({ id: 'n1', type: 'math.add', name: 'Add', position: { x: 0, y: 0 }, parameters: { a: 1 } })
  importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] })
  return JSON.parse(projectFileText(buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'Good' }, bridges }, definitions)))
}
export const asFile = (json: unknown) => new File([JSON.stringify(json)], 'x.kopruq')
export const REJECTIONS: [string, (f: Json) => void, RegExp][] = [
  ['project.environment is a number', (f) => { f.projectState.project.environment = 5 }, /projectState\.project\.environment/],
  ['units.length is a number', (f) => { f.projectState.project.units.length = 5 }, /projectState\.project\.units\.length/],
  ['a bridge row is empty', (f) => { f.projectState.bridges = [{}] }, /projectState\.bridges\[0\]\.no/],
  ['a span is a string', (f) => { f.projectState.bridges[0].spansM = ['x'] }, /projectState\.bridges\[0\]\.spansM\[0\]/],
  ['bridgeType is unknown', (f) => { f.projectState.bridges[0].bridgeType = 'X' }, /projectState\.bridges\[0\]\.bridgeType/],
  ['bridgeDefinitions is empty', (f) => { f.bridgeDefinitions = {} }, /bridgeDefinitions\.definitions/],
  ['definitions is an array', (f) => { f.bridgeDefinitions.definitions = [] }, /bridgeDefinitions\.definitions/],
  ['an axis is empty', (f) => { f.bridgeDefinitions.definitions['VIA-02'].axes = [{}] }, /bridgeDefinitions\.definitions\.VIA-02\.axes\[0\]/],
  ['a constraint kind is unknown', (f) => { f.bridgeDefinitions.definitions['VIA-02'].constraints[0].kind = 'LAVA' }, /constraints\[0\]\.kind/],
  ['a family record is null', (f) => { f.families.PIER = [null] }, /families\.PIER\[0\]/],
  ['a family record has no id', (f) => { f.families.PIER = [{ name: 'x' }] }, /families\.PIER\[0\]\.id/],
  ['family ids repeat', (f) => { f.families.PIER = [{ id: 'p' }, { id: 'p' }] }, /families\.PIER.*duplicate id "p"/],
  ['a family field has the wrong type', (f) => { f.families.PIER_CAP = [{ id: 'c', capType: 'ROUND' }] }, /families\.PIER_CAP\[0\]\.capType/],
  ['a graph node is empty', (f) => { f.graph.graphs[0].nodes = [{}] }, /graph\.graphs\[0\]\.nodes\[0\]/],
  ['a graph connection is empty', (f) => { f.graph.graphs[0].connections = [{}] }, /graph\.graphs\[0\]\.connections\[0\]/],
]
