/** Output boundary for future Graph generation; this is not a manually authored bridge definition. */
export interface GeneratedBridgeModel {
  id: string
  sourceGraphId: string
  alternativeId: string
  geometry: unknown
  spans: unknown[]
  axes: unknown[]
  assignments: Record<string, { category: string; familyId: string }>
  metadata: Record<string, unknown>
}
