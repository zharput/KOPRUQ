export type AssemblyKind = 'PIER' | 'ABUTMENT'

export interface AssemblyNode {
  id: string
  label: string
  familyRoute?: string
  status: 'CATALOG' | 'DERIVED' | 'NOT_CONFIGURED' | 'NOT_AVAILABLE'
  note?: string
}

export interface VerticalSystemDefinition {
  kind: AssemblyKind
  nodes: AssemblyNode[]
  actualPierHeight: 'DERIVED_FROM_BRIDGE_GEOMETRY'
}

export const PIER_ASSEMBLY: VerticalSystemDefinition = {
  kind: 'PIER',
  actualPierHeight: 'DERIVED_FROM_BRIDGE_GEOMETRY',
  nodes: [
    { id: 'red-level', label: 'Red Level', status: 'DERIVED' },
    { id: 'pavement', label: 'Pavement', status: 'DERIVED' },
    { id: 'deck', label: 'Deck / Slab', familyRoute: 'superstructure-families', status: 'CATALOG' },
    { id: 'girder', label: 'Girder', familyRoute: 'girder-library', status: 'CATALOG' },
    { id: 'bearing', label: 'Bearing', familyRoute: 'bearing-families', status: 'NOT_CONFIGURED' },
    { id: 'pier-cap', label: 'Pier Cap', familyRoute: 'pier-cap-families', status: 'NOT_CONFIGURED' },
    { id: 'pier', label: 'Pier', familyRoute: 'pier-families', status: 'CATALOG', note: 'Height applicability stays on Pier Family.' },
    { id: 'foundation', label: 'Foundation', familyRoute: 'foundation-families', status: 'NOT_CONFIGURED' },
  ],
}

export const ABUTMENT_ASSEMBLY: VerticalSystemDefinition = {
  kind: 'ABUTMENT',
  actualPierHeight: 'DERIVED_FROM_BRIDGE_GEOMETRY',
  nodes: [
    { id: 'red-level', label: 'Red Level', status: 'DERIVED' },
    { id: 'pavement', label: 'Pavement', status: 'DERIVED' },
    { id: 'deck', label: 'Deck / Slab', familyRoute: 'superstructure-families', status: 'CATALOG' },
    { id: 'girder', label: 'Girder', familyRoute: 'girder-library', status: 'CATALOG' },
    { id: 'bearing', label: 'Bearing', familyRoute: 'bearing-families', status: 'NOT_CONFIGURED' },
    { id: 'backwall', label: 'Backwall', status: 'NOT_CONFIGURED', note: 'Derived later from girder, bearing, joint and clearance rules.' },
    { id: 'front-wall', label: 'Front Wall', familyRoute: 'abutment-families', status: 'NOT_CONFIGURED', note: 'Front wall height is a future geometry parameter.' },
    { id: 'foundation', label: 'Foundation', familyRoute: 'foundation-families', status: 'NOT_CONFIGURED' },
  ],
}
