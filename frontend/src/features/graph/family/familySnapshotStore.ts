import type { FamilyCalculationSnapshot, FamilyCategory, SnapshotFreshness } from './familyResults'

const snapshots = new Map<string, FamilyCalculationSnapshot>()
const key = (bridgeId: string, graphDocumentId: string, sourceNodeId: string, category?: FamilyCategory) => [bridgeId, graphDocumentId, sourceNodeId, category ?? ''].join('|')
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('kopruq:family-snapshots-changed')) }

/** A publish replaces every snapshot of the graphs it covers, so snapshots of deleted nodes do not survive. */
export function publishFamilySnapshots(items: readonly FamilyCalculationSnapshot[]) {
  const graphs = new Set(items.map(item => `${item.bridgeId}|${item.graphDocumentId}`))
  for (const [itemKey, item] of snapshots) if (graphs.has(`${item.bridgeId}|${item.graphDocumentId}`)) snapshots.delete(itemKey)
  for (const item of items) snapshots.set(key(item.bridgeId, item.graphDocumentId, item.sourceNodeId, item.familyCategory), item)
  notify()
}
export function getFamilySnapshots(bridgeId: string, graphDocumentId: string) { return [...snapshots.values()].filter(item => item.bridgeId === bridgeId && item.graphDocumentId === graphDocumentId) }
export function getFamilySnapshot(bridgeId: string, graphDocumentId: string, sourceNodeId: string) { return getFamilySnapshots(bridgeId, graphDocumentId).find(item => item.sourceNodeId === sourceNodeId) }
export function getFamilyAlternatives(bridgeId: string, graphDocumentId: string, category: FamilyCategory) { return getFamilySnapshots(bridgeId, graphDocumentId).filter(item => item.familyCategory === category).flatMap(item => item.candidates) }
export function markFamilySnapshotsStale(bridgeId: string, graphDocumentId: string, fingerprint: string) {
  let changed = false
  for (const [itemKey, item] of snapshots) if (item.bridgeId === bridgeId && item.graphDocumentId === graphDocumentId && item.graphFingerprint !== fingerprint && item.freshness !== 'STALE') { snapshots.set(itemKey, { ...item, freshness: 'STALE' as SnapshotFreshness }); changed = true }
  if (changed) notify()
}
export function clearFamilySnapshots() { const hadSnapshots = snapshots.size > 0; snapshots.clear(); if (hadSnapshots) notify() }
