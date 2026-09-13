/**
 * Project Information's domain model (2026-09-10 mockup, real corridor
 * data - a 12-bridge inventory spreadsheet the engineer shared).
 * Extracted from ProjectPanel.tsx during the architecture migration
 * (2026-09-12) so `ProjectPanel`, `ProjectDashboardPanel`, and
 * `api/excelImport.ts` all share one definition instead of importing
 * a component file for its types.
 */
export type BridgeType = 'Precast Girder' | 'Steel Composite Girder' | 'Cantilever Bridge'
export type PierShape = 'Rectangular' | 'Circular' | 'Box' | 'Oval'

export const BRIDGE_TYPES: BridgeType[] = ['Precast Girder', 'Steel Composite Girder', 'Cantilever Bridge']
export const PIER_SHAPES: PierShape[] = ['Rectangular', 'Circular', 'Box', 'Oval']

export interface BridgeRow {
  no: string
  km: string
  crossingType: string
  estimatedLengthM: number
  roadWidthM: number
  terrain: string
  status: string
  bridgeType: BridgeType
  spansM: number[]
  girderDepthCm: number[] | null
  girderNote: string | null
  pierShape: PierShape
}

// The engineer's own corridor bridge-inventory spreadsheet, transcribed exactly
// (2026-09-10). "Balanced Cantilever" in the source data maps to the
// standardized "Cantilever Bridge" dropdown option below - same method, the
// dropdown just names the 3 allowed types the engineer specified.
export const INITIAL_BRIDGES: BridgeRow[] = [
  { no: 'VIA-01', km: '13+180.000', crossingType: 'River + Highway', estimatedLengthM: 650.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Cantilever Bridge', spansM: [140], girderDepthCm: null, girderNote: 'Box (fixed cross-section)', pierShape: 'Box' },
  { no: 'VIA-02', km: '14+170.000', crossingType: 'Valley', estimatedLengthM: 205.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Circular' },
  { no: 'VIA-03', km: '14+800.000', crossingType: 'Valley', estimatedLengthM: 40.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Circular' },
  { no: 'VIA-04', km: '15+000.000', crossingType: 'Valley', estimatedLengthM: 80.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Circular' },
  { no: 'VIA-05', km: '16+000.000', crossingType: 'River', estimatedLengthM: 310.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Steel Composite Girder', spansM: [45, 60, 70, 80, 90], girderDepthCm: [300, 320, 340, 360, 400], girderNote: null, pierShape: 'Rectangular' },
  { no: 'VIA-06', km: '17+500.000', crossingType: 'Valley', estimatedLengthM: 160.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Rectangular' },
  { no: 'VIA-07', km: '18+250.000', crossingType: 'Valley', estimatedLengthM: 405.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Rectangular' },
  { no: 'VIA-08', km: '19+500.000', crossingType: 'Valley', estimatedLengthM: 100.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Rectangular' },
  { no: 'VIA-09', km: '20+350.000', crossingType: 'Valley', estimatedLengthM: 325.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Oval' },
  { no: 'VIA-10', km: '21+450.000', crossingType: 'Valley', estimatedLengthM: 35.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Precast Girder', spansM: [30, 35, 40], girderDepthCm: [160, 190], girderNote: null, pierShape: 'Oval' },
  { no: 'VIA-11', km: '23+000.000', crossingType: 'River', estimatedLengthM: 440.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Steel Composite Girder', spansM: [45, 60, 70, 80, 90], girderDepthCm: [300, 320, 340, 360, 400], girderNote: null, pierShape: 'Circular' },
  { no: 'VIA-12', km: '24+670.000', crossingType: 'Valley', estimatedLengthM: 280.0, roadWidthM: 13.8, terrain: '—', status: '—', bridgeType: 'Steel Composite Girder', spansM: [45, 60, 70, 80, 90], girderDepthCm: [300, 320, 340, 360, 400], girderNote: null, pierShape: 'Box' },
]
