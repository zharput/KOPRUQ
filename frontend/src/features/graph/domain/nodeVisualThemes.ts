import type { GraphPortType } from './types'
export type NodeCategory = 'INPUT' | 'MATH' | 'MATERIALS' | 'PIER' | 'ABUTMENT' | 'CAP' | 'FOUNDATION' | 'BEARING' | 'GIRDER' | 'SUPERSTRUCTURE' | 'BRIDGE' | 'GEOMETRY' | 'SUBSTRUCTURE' | 'STRUCTURAL_FAMILY' | 'LOADS' | 'ANALYSIS' | 'DESIGN' | 'OPTIMIZATION' | 'OUTPUT'

export type NodeTheme = { className: string; accentToken: string; borderToken: string; headerToken: string; textToken: string }
export const NODE_CATEGORY_COLORS: Readonly<Partial<Record<NodeCategory, string>>> = {
  INPUT: 'var(--sp-node-input)', MATH: 'var(--sp-node-math)', MATERIALS: 'var(--sp-node-materials)', PIER: 'var(--sp-node-pier)', ABUTMENT: 'var(--sp-node-abutment)', CAP: 'var(--sp-node-cap)', FOUNDATION: 'var(--sp-node-foundation)', BEARING: 'var(--sp-node-bearing)', GIRDER: 'var(--sp-node-girder)', SUPERSTRUCTURE: 'var(--sp-node-superstructure)', BRIDGE: 'var(--sp-node-bridge)', GEOMETRY: 'var(--sp-node-geometry)', SUBSTRUCTURE: 'var(--sp-node-substructure)', STRUCTURAL_FAMILY: 'var(--sp-node-structural-family)', LOADS: 'var(--sp-node-loads)', ANALYSIS: 'var(--sp-node-analysis)', DESIGN: 'var(--sp-node-design)', OPTIMIZATION: 'var(--sp-node-optimization)', OUTPUT: 'var(--sp-node-output)',
}
export const NODE_CATEGORY_LIGHT_COLORS: Readonly<Partial<Record<NodeCategory, string>>> = NODE_CATEGORY_COLORS
export const GRAPH_EDGE_COLORS = { default: 'var(--sp-link-default)', hover: 'var(--sp-link-hover)', selected: 'var(--sp-link-selected)', disabled: 'var(--sp-link-disabled)' } as const
export function getGraphEdgeColor(): string { return GRAPH_EDGE_COLORS.default }

/** Presentation-only category themes. Registry metadata remains on NodeDefinition, never saved graph nodes. */
export const NODE_THEME_REGISTRY: Readonly<Record<NodeCategory, NodeTheme>> = {
  INPUT: { className: 'category-input', accentToken: '--node-input-accent', borderToken: '--node-input-border', headerToken: '--node-input-header', textToken: '--node-input-text' },
  MATH: { className: 'category-math', accentToken: '--node-math-accent', borderToken: '--node-math-border', headerToken: '--node-math-header', textToken: '--node-math-text' },
  MATERIALS: { className: 'category-materials', accentToken: '--node-material-accent', borderToken: '--node-material-border', headerToken: '--node-material-header', textToken: '--node-material-text' },
  PIER: { className: 'category-pier', accentToken: '--node-pier-accent', borderToken: '--node-pier-border', headerToken: '--node-pier-header', textToken: '--node-pier-text' },
  ABUTMENT: { className: 'category-abutment', accentToken: '--node-abutment-accent', borderToken: '--node-abutment-border', headerToken: '--node-abutment-header', textToken: '--node-abutment-text' },
  CAP: { className: 'category-cap', accentToken: '--node-cap-accent', borderToken: '--node-cap-border', headerToken: '--node-cap-header', textToken: '--node-cap-text' },
  FOUNDATION: { className: 'category-foundation', accentToken: '--node-foundation-accent', borderToken: '--node-foundation-border', headerToken: '--node-foundation-header', textToken: '--node-foundation-text' },
  BEARING: { className: 'category-bearing', accentToken: '--node-bearing-accent', borderToken: '--node-bearing-border', headerToken: '--node-bearing-header', textToken: '--node-bearing-text' },
  GIRDER: { className: 'category-girder', accentToken: '--node-girder-accent', borderToken: '--node-girder-border', headerToken: '--node-girder-header', textToken: '--node-girder-text' },
  GEOMETRY: { className: 'category-geometry', accentToken: '--node-geometry-accent', borderToken: '--node-geometry-border', headerToken: '--node-geometry-header', textToken: '--node-geometry-text' },
  SUPERSTRUCTURE: { className: 'category-superstructure', accentToken: '--node-superstructure-accent', borderToken: '--node-superstructure-border', headerToken: '--node-superstructure-header', textToken: '--node-superstructure-text' },
  BRIDGE: { className: 'category-bridge', accentToken: '--node-bridge-accent', borderToken: '--node-bridge-border', headerToken: '--node-bridge-header', textToken: '--node-bridge-text' },
  SUBSTRUCTURE: { className: 'category-substructure', accentToken: '--node-substructure-accent', borderToken: '--node-substructure-border', headerToken: '--node-substructure-header', textToken: '--node-substructure-text' },
  STRUCTURAL_FAMILY: { className: 'category-structural-family', accentToken: '--node-structural-family-accent', borderToken: '--node-structural-family-border', headerToken: '--node-structural-family-header', textToken: '--node-structural-family-text' },
  LOADS: { className: 'category-loads', accentToken: '--node-load-accent', borderToken: '--node-load-border', headerToken: '--node-load-header', textToken: '--node-load-text' },
  ANALYSIS: { className: 'category-analysis', accentToken: '--node-analysis-accent', borderToken: '--node-analysis-border', headerToken: '--node-analysis-header', textToken: '--node-analysis-text' },
  DESIGN: { className: 'category-design', accentToken: '--node-design-accent', borderToken: '--node-design-border', headerToken: '--node-design-header', textToken: '--node-design-text' },
  OPTIMIZATION: { className: 'category-optimization', accentToken: '--node-optimization-accent', borderToken: '--node-optimization-border', headerToken: '--node-optimization-header', textToken: '--node-optimization-text' },
  OUTPUT: { className: 'category-output', accentToken: '--node-output-accent', borderToken: '--node-output-border', headerToken: '--node-output-header', textToken: '--node-output-text' },
}

export function getNodeTheme(category: NodeCategory): NodeTheme { return NODE_THEME_REGISTRY[category] }
export function getNodePresentationCategory(category: NodeCategory, type?: string): NodeCategory {
  if (category !== 'STRUCTURAL_FAMILY' || !type) return category
  if (type === 'structural.superstructure' || type === 'structural.span_arrangement') return 'SUPERSTRUCTURE'
  if (type === 'structural.abutment') return 'ABUTMENT'
  if (type.startsWith('structural.girder.')) return 'GIRDER'
  if (type.startsWith('substructure.pier-cap.')) return 'CAP'
  if (type.startsWith('substructure.foundation.')) return 'FOUNDATION'
  if (type.startsWith('substructure.bearing.')) return 'BEARING'
  if (type.startsWith('substructure.pier.')) return 'PIER'
  return category
}
export function getNodeThemeForType(category: NodeCategory, type?: string): NodeTheme { return getNodeTheme(getNodePresentationCategory(category, type)) }
export function getNodeCategoryColor(category: NodeCategory, type?: string): string | undefined { return NODE_CATEGORY_COLORS[getNodePresentationCategory(category, type)] }
export function getNodeHeaderStyle(category: NodeCategory, type?: string): { backgroundColor?: string; color: string } {
  const backgroundColor = getNodeCategoryColor(category, type)
  const darkText = new Set(['INPUT', 'MATH', 'MATERIALS', 'CAP', 'FOUNDATION', 'GIRDER', 'STRUCTURAL_FAMILY', 'LOADS', 'DESIGN', 'OUTPUT'])
  const resolved = getNodePresentationCategory(category, type)
  return { backgroundColor, color: darkText.has(resolved) ? 'var(--sp-node-header-text-dark)' : 'var(--sp-node-header-text-light)' }
}
export function getNodeCategoryLabel(category: NodeCategory): string { return category === 'STRUCTURAL_FAMILY' ? 'STRUCTURAL / FAMILY' : category }

/** Port and edge appearance encodes the transported value type, independent of node category. */
export const DATA_TYPE_THEME_REGISTRY: Readonly<Record<GraphPortType, string>> = {
  'abutmentCandidate[]': '#e4b65c',
  number: '#4c91ff', integer: '#6bbcc4', numeric: '#4c91ff', boolean: '#c18af7', string: '#8b9caf',
  'number[]': '#e4b65c', 'integer[]': '#e4b65c', 'numeric[]': '#e4b65c', quantity: '#4c91ff', 'quantity[]': '#e4b65c', length: '#4c91ff', 'length[]': '#e4b65c',
  concreteMaterial: '#38b7a7', reinforcementMaterial: '#c47b58', prestressingSteelMaterial: '#d49a4b', structuralSteelMaterial: '#8b9caf',
  'pierCandidate[]': '#e4b65c', 'pierCapCandidate[]': '#e4b65c', 'foundationCandidate[]': '#e4b65c', 'bearingCandidate[]': '#e4b65c', 'girderCandidate[]': '#e4b65c', 'superstructureCandidate[]': '#e4b65c', 'spanArrangementCandidate[]': '#e4b65c', bridgeAssembly: '#57a6cc', 'display:any': '#8b9caf', pierFamily: '#a98be8', foundationFamily: '#a98be8', bearingFamily: '#a98be8', bridge: '#57a6cc', alignment: '#43b5c9', geometry: '#43b5c9', loadCase: '#c36d87', analysisModel: '#7890a8', analysisResult: '#89a0d8',
}

export function getDataTypeColor(type?: GraphPortType): string { return type ? DATA_TYPE_THEME_REGISTRY[type] : '#4c91ff' }

