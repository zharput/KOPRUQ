/**
 * The seam between LAYOUT-P01 (Site & Layout) and P03's existing
 * structural alternative generation (Generate): when the engineer picks
 * a feasible BridgeLayoutAlternative, its bridge length and uniform span
 * length are carried over here rather than being retyped by hand - the
 * "bridge length is a design variable, not a fixed input" principle
 * (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md's non-negotiable principles),
 * made real without a new backend endpoint: GenerateWorkflow's existing
 * KernelStateRequest just gets pre-filled with these two numbers, then
 * runs through the unchanged /api/alternatives flow.
 */
export interface LayoutSeed {
  totalLengthM: number
  spanLengthM: number
}
