import type { GraphPortType } from './types'
export type NodeCategory = 'INPUT' | 'MATH' | 'MATERIALS' | 'GEOMETRY' | 'SUPERSTRUCTURE' | 'SUBSTRUCTURE' | 'STRUCTURAL_FAMILY' | 'LOADS' | 'ANALYSIS' | 'DESIGN' | 'OPTIMIZATION' | 'OUTPUT'

export type NodeTheme = { className: string; accentToken: string; borderToken: string; headerToken: string; textToken: string }

/** Presentation-only category themes. Registry metadata remains on NodeDefinition, never saved graph nodes. */
export const NODE_THEME_REGISTRY: Readonly<Record<NodeCategory, NodeTheme>> = {
  INPUT: { className: 'category-input', accentToken: '--node-input-accent', borderToken: '--node-input-border', headerToken: '--node-input-header', textToken: '--node-input-text' },
  MATH: { className: 'category-math', accentToken: '--node-math-accent', borderToken: '--node-math-border', headerToken: '--node-math-header', textToken: '--node-math-text' },
  MATERIALS: { className: 'category-materials', accentToken: '--node-material-accent', borderToken: '--node-material-border', headerToken: '--node-material-header', textToken: '--node-material-text' },
  GEOMETRY: { className: 'category-geometry', accentToken: '--node-geometry-accent', borderToken: '--node-geometry-border', headerToken: '--node-geometry-header', textToken: '--node-geometry-text' },
  SUPERSTRUCTURE: { className: 'category-superstructure', accentToken: '--node-superstructure-accent', borderToken: '--node-superstructure-border', headerToken: '--node-superstructure-header', textToken: '--node-superstructure-text' },
  SUBSTRUCTURE: { className: 'category-substructure', accentToken: '--node-substructure-accent', borderToken: '--node-substructure-border', headerToken: '--node-substructure-header', textToken: '--node-substructure-text' },
  STRUCTURAL_FAMILY: { className: 'category-structural-family', accentToken: '--node-structural-family-accent', borderToken: '--node-structural-family-border', headerToken: '--node-structural-family-header', textToken: '--node-structural-family-text' },
  LOADS: { className: 'category-loads', accentToken: '--node-load-accent', borderToken: '--node-load-border', headerToken: '--node-load-header', textToken: '--node-load-text' },
  ANALYSIS: { className: 'category-analysis', accentToken: '--node-analysis-accent', borderToken: '--node-analysis-border', headerToken: '--node-analysis-header', textToken: '--node-analysis-text' },
  DESIGN: { className: 'category-design', accentToken: '--node-design-accent', borderToken: '--node-design-border', headerToken: '--node-design-header', textToken: '--node-design-text' },
  OPTIMIZATION: { className: 'category-optimization', accentToken: '--node-optimization-accent', borderToken: '--node-optimization-border', headerToken: '--node-optimization-header', textToken: '--node-optimization-text' },
  OUTPUT: { className: 'category-output', accentToken: '--node-output-accent', borderToken: '--node-output-border', headerToken: '--node-output-header', textToken: '--node-output-text' },
}

export function getNodeTheme(category: NodeCategory): NodeTheme { return NODE_THEME_REGISTRY[category] }
export function getNodeCategoryLabel(category: NodeCategory): string { return category === 'STRUCTURAL_FAMILY' ? 'STRUCTURAL / FAMILY' : category }

/** Port and edge appearance encodes the transported value type, independent of node category. */
export const DATA_TYPE_THEME_REGISTRY: Readonly<Record<GraphPortType, string>> = {
  number: '#4c91ff', integer: '#6bbcc4', numeric: '#4c91ff', boolean: '#c18af7', string: '#8b9caf',
  'number[]': '#e4b65c', 'integer[]': '#e4b65c', 'numeric[]': '#e4b65c', quantity: '#4c91ff', 'quantity[]': '#e4b65c', length: '#4c91ff', 'length[]': '#e4b65c',
  concreteMaterial: '#38b7a7', reinforcementMaterial: '#c47b58', prestressingSteelMaterial: '#d49a4b', structuralSteelMaterial: '#8b9caf',
  'pierCandidate[]': '#e4b65c', 'pierCapCandidate[]': '#e4b65c', 'foundationCandidate[]': '#e4b65c', 'display:any': '#8b9caf', pierFamily: '#a98be8', foundationFamily: '#a98be8', bearingFamily: '#a98be8', bridge: '#57a6cc', alignment: '#43b5c9', geometry: '#43b5c9', loadCase: '#c36d87', analysisModel: '#7890a8', analysisResult: '#89a0d8',
}

export function getDataTypeColor(type?: GraphPortType): string { return type ? DATA_TYPE_THEME_REGISTRY[type] : '#4c91ff' }
