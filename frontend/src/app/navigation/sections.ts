/**
 * Full grouped sidebar navigation, matching the engineer's own detailed
 * menu screenshots (2026-09-10) exactly - group names, leaf names, and
 * hierarchy. A leaf with real sub-items in the engineer's own mockup
 * (Alignment, GIS & Satellite, Geotechnical, Seismic, Meteorology,
 * Hydrology & Hydraulic, Constraints, Superstructure Families) opens a
 * card-grid "big menu" in the main content area on click, per the
 * engineer's own instruction ("Loads'a basınca sağdaki büyük menüde yük
 * çeşitleri çıkacak") - never a nested sidebar tree. See
 * {@link BIG_MENU_ITEMS}.
 *
 * <p>Real functionality: 'home' (HomePanel), 'project-information'
 * (ProjectPanel), 'loads' (LoadsPanel), 'layout-generator'
 * (SiteLayoutPanel, LAYOUT-P01), 'bridge-alternatives' (GenerateWorkflow,
 * P02-P05 - re-attached here from the retired 'bridge-design' leaf, since
 * "Bridge Alternatives" is this engineer-given tree's closest semantic
 * match: a results table of structural alternatives, exactly what that
 * screen already produces), 'spanova-fast-solver' (FastSolverPanel,
 * addendum P). Every leaf with an entry in {@link BIG_MENU_ITEMS} is also
 * real (BigMenuPanel). Every other leaf is an honest placeholder (see
 * PlaceholderPanel).
 *
 * <p>Retired this revision (present in an earlier menu screenshot, not in
 * this one): 'design-space', 'layout-design-space', 'bridge-design'.
 * {@code LayoutDesignSpacePanel.tsx} (built for 'layout-design-space')
 * has no route into it anymore - kept in the tree, not deleted, since it
 * was real, working, engineer-requested functionality; flag to the
 * engineer rather than silently discarding it.
 *
 * <p>Also retired (2026-09-10): 'design-codes'/'units'/'design-criteria'
 * as standalone leaves - folded into `ProjectPanel` itself as three
 * dropdowns at the top of Project Information, per the engineer's own
 * instruction.
 *
 * <p>Cancelled outright (2026-09-13, engineer's own instruction - "iptal
 * edelim"/"kaldır", not just left as placeholders): 'carbon-database'
 * (Project group) and 'construction-methods' (Design System group) -
 * removed from the tree entirely, not merely undecided.
 *
 * <p>Reorganized again same day, later: 'materials'/'loads' moved from
 * the Project group into Design System (now its first two leaves,
 * Materials before Loads - engineer's own instruction). 'seismic' moved
 * out of Site & Corridor entirely - its 4 items (Hazard Data/PGA-
 * Spectral Data/Site Class/Design Spectrum) now live as real content
 * under Loads' own "Seismic" tab (`features/loads/components/
 * LoadsPanel.tsx`) instead of a separate BigMenuPanel leaf - "LOADS'daki
 * seismic içine gelecek". 'meteorology' removed outright (not merged
 * anywhere) - Loads' own Temperature/Wind categories already cover it,
 * per the engineer's own reasoning ("loads kısmında var zaten"). Design
 * System's "Families"/"Library" suffixes dropped from every label
 * (Superstructure/Girder/Preferred Span/Pier/Abutment/Foundation/
 * Bearing) - the `SectionId`/route values themselves are unchanged,
 * only the displayed label text.
 *
 * <p>Design System reordered again (2026-09-14, engineer's own
 * instruction - "BU MENÜDE material ve loads en sonda olsun"):
 * Materials/Loads moved from first to LAST in this group (after
 * Standardization Rules), reversing the "first two leaves" ordering
 * from the note above. `TopBar.tsx` reads this same array, so both the
 * sidebar and the top tab row picked up the new order automatically -
 * no separate ordering to keep in sync.
 */
export type SectionId =
  | 'home'
  | 'project-dashboard'
  | 'project-information'
  | 'materials'
  | 'loads'
  | 'load-combinations'
  | 'cost-database'
  | 'corridor-dashboard'
  | 'alignment'
  | 'terrain-dtm'
  | 'gis-satellite'
  | 'geotechnical'
  | 'hydrology-hydraulic'
  | 'constraints'
  | 'superstructure-families'
  | 'girder-library'
  | 'preferred-span-families'
  | 'pier-families'
  | 'abutment-families'
  | 'foundation-families'
  | 'bearing-families'
  | 'standardization-rules'
  | 'system-assembly'
  | 'pier-cap-families'
  | 'pile-families'
  | 'bridge-inventory'
  | 'bridge-site'
  | 'layout-generator'
  | 'layout-alternatives'
  | 'selected-layout'
  | 'bridge-superstructure'
  | 'bridge-piers'
  | 'bridge-abutments'
  | 'bridge-bearings'
  | 'bridge-foundations'
  | 'bridge-alternatives'
  | 'model-reduction'
  | 'spanova-fast-solver'
  | 'analysis-queue'
  | 'results'
  | 'opensees-verification'
  | 'midas-nx-final-verification'
  | 'layout-optimization'
  | 'structural-optimization'
  | 'bridge-optimization'
  | 'corridor-optimization'
  | 'standardization'
  | 'pareto-explorer'
  | '3d-visualization'
  | 'reports'
  | 'settings'
  | 'help'

/**
 * Leaves whose mockup shows real sub-items - each renders a BigMenuPanel
 * card grid on click. 'alignment' was removed from this map 2026-09-12
 * (engineer's own instruction: it now shows only an Import Alignment
 * action - see app/router.tsx's dedicated branch for it).
 */
export const BIG_MENU_ITEMS: Partial<Record<SectionId, string[]>> = {
  'gis-satellite': ['Satellite Imagery', 'Roads', 'Railways', 'Rivers', 'Buildings', 'Utilities'],
  geotechnical: ['Boreholes', 'Soil / Rock Layers', 'Groundwater', 'Design Parameters'],
  'hydrology-hydraulic': ['Rivers', 'Flood Zones', 'Water Levels', 'Scour'],
  constraints: ['No-Pier Zones', 'Roads / Junctions', 'Railway Clearances', 'River Clearances', 'Utilities', 'Environmental Zones', 'Construction Restrictions'],
}

/**
 * Sections with real functionality behind them - drives both App.tsx's
 * GenerateWorkflow fallback (only 'bridge-alternatives' actually reaches
 * it; the others below are routed to their own components by an earlier,
 * more specific check) and TopBar's dimming of not-yet-real step tabs.
 * BIG_MENU_ITEMS keys are real too but tracked separately (App.tsx checks
 * that map directly).
 */
export const WORKING_SECTIONS: ReadonlySet<SectionId> = new Set([
  'project-dashboard',
  'project-information',
  'materials',
  'loads',
  'cost-database',
  'superstructure-families',
  'girder-library',
  'pier-families',
  'pier-cap-families',
  'layout-generator',
  'bridge-alternatives',
  'spanova-fast-solver',
])

export interface SectionMeta {
  id: SectionId
  label: string
}

export interface NavGroup {
  id: string
  label: string
  sections: SectionMeta[]
}

export const SIDEBAR_TOP_ITEMS: SectionMeta[] = [{ id: 'home', label: 'Home' }]

export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: 'project',
    label: 'Project',
    sections: [
      { id: 'project-dashboard', label: 'Project Dashboard' },
      { id: 'project-information', label: 'Project Information' },
      { id: 'cost-database', label: 'Cost Database' },
    ],
  },
  {
    id: 'site-corridor',
    label: 'Site & Corridor',
    sections: [
      { id: 'corridor-dashboard', label: 'Corridor Dashboard' },
      { id: 'alignment', label: 'Alignment' },
      { id: 'terrain-dtm', label: '3D Terrain / DTM' },
      { id: 'gis-satellite', label: 'GIS & Satellite' },
      { id: 'geotechnical', label: 'Geotechnical' },
      { id: 'hydrology-hydraulic', label: 'Hydrology & Hydraulic' },
      { id: 'constraints', label: 'Constraints' },
    ],
  },
  {
    id: 'design-system',
    label: 'Design System',
    sections: [
      { id: 'system-assembly', label: 'System Assembly' },
      { id: 'superstructure-families', label: 'Superstructure' },
      { id: 'girder-library', label: 'Girder' },
      { id: 'preferred-span-families', label: 'Preferred Span' },
      { id: 'bearing-families', label: 'Bearing' },
      { id: 'pier-cap-families', label: 'Pier Cap' },
      { id: 'pier-families', label: 'Pier' },
      { id: 'foundation-families', label: 'Foundation' },
      { id: 'pile-families', label: 'Pile' },
      { id: 'abutment-families', label: 'Abutment' },
      { id: 'standardization-rules', label: 'Standardization Rules' },
    ],
  },
  {
    id: 'loads-combinations',
    label: 'Loads & Combinations',
    sections: [
      { id: 'materials', label: 'Materials' },
      { id: 'loads', label: 'Load Models' },
      { id: 'load-combinations', label: 'Load Combinations' },
    ],
  },
  {
    id: 'bridges',
    label: 'Bridges',
    sections: [
      { id: 'bridge-inventory', label: 'Bridge Inventory' },
      { id: 'bridge-site', label: 'Bridge Site' },
      { id: 'layout-generator', label: 'Layout Generator' },
      { id: 'layout-alternatives', label: 'Layout Alternatives' },
      { id: 'selected-layout', label: 'Selected Layout' },
      { id: 'bridge-superstructure', label: 'Superstructure' },
      { id: 'bridge-piers', label: 'Piers' },
      { id: 'bridge-abutments', label: 'Abutments' },
      { id: 'bridge-bearings', label: 'Bearings' },
      { id: 'bridge-foundations', label: 'Foundations' },
      { id: 'bridge-alternatives', label: 'Bridge Alternatives' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    sections: [
      { id: 'model-reduction', label: 'Model Reduction' },
      { id: 'spanova-fast-solver', label: 'SPANOVA Fast Solver' },
      { id: 'analysis-queue', label: 'Analysis Queue' },
      { id: 'results', label: 'Results' },
      { id: 'opensees-verification', label: 'OpenSees Verification' },
      { id: 'midas-nx-final-verification', label: 'MIDAS NX Final Verification' },
    ],
  },
  {
    id: 'optimization',
    label: 'Optimization',
    sections: [
      { id: 'layout-optimization', label: 'Layout Optimization' },
      { id: 'structural-optimization', label: 'Structural Optimization' },
      { id: 'bridge-optimization', label: 'Bridge Optimization' },
      { id: 'corridor-optimization', label: 'Corridor Optimization' },
      { id: 'standardization', label: 'Standardization' },
      { id: 'pareto-explorer', label: 'Pareto Explorer' },
    ],
  },
]

export const SIDEBAR_BOTTOM_ITEMS: SectionMeta[] = [
  { id: '3d-visualization', label: '3D & Visualization' },
  { id: 'reports', label: 'Reports' },
]

export const SIDEBAR_FOOTER_SECTIONS: SectionMeta[] = [
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
]

export const SECTION_LABELS: Record<SectionId, string> = Object.fromEntries(
  [
    ...SIDEBAR_TOP_ITEMS,
    ...SIDEBAR_GROUPS.flatMap((group) => group.sections),
    ...SIDEBAR_BOTTOM_ITEMS,
    ...SIDEBAR_FOOTER_SECTIONS,
  ].map((s) => [s.id, s.label]),
) as Record<SectionId, string>
