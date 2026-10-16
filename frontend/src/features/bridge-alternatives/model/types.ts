/**
 * Shared between GenerateWorkflow (produces it) and the former HomePanel
 * (removed in G4; displayed it via this feature's public index.ts), lifted
 * so Home could show real numbers from the last GENERATE run.
 * analyzedCount/paretoCount are always 0 - P07 (analysis) and P09
 * (optimization) don't exist yet, so there is nothing to analyze or
 * rank. Shown as real zeros, not hidden.
 */
export interface GenerationSummary {
  bridgeName: string
  totalLengthM: number
  deckWidthM: number
  generatedCount: number
  feasibleCount: number
  analyzedCount: number
  paretoCount: number
}
