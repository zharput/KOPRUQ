import type { FamilyCalculationSnapshot, FamilyCategory, SnapshotFreshness } from './familyResults'

const snapshots = new Map<string, FamilyCalculationSnapshot>()
const key = (bridgeId: string, graphDocumentId: string, sourceNodeId: string, category?: FamilyCategory) => [bridgeId, graphDocumentId, sourceNodeId, category ?? ''].join('|')

export function publishFamilySnapshots(items: readonly FamilyCalculationSnapshot[]) { for (const item of items) snapshots.set(key(item.bridgeId, item.graphDocumentId, item.sourceNodeId, item.familyCategory), item); if (typeof window !== 'undefined') window.dispatchEvent(new Event('spanova:family-snapshots-changed')) }
export function getFamilySnapshots(bridgeId: string, graphDocumentId: string) { return [...snapshots.values()].filter(item => item.bridgeId === bridgeId && item.graphDocumentId === graphDocumentId) }
export function getFamilySnapshot(bridgeId: string, graphDocumentId: string, sourceNodeId: string) { return getFamilySnapshots(bridgeId, graphDocumentId).find(item => item.sourceNodeId === sourceNodeId) }
export function getFamilyAlternatives(bridgeId: string, graphDocumentId: string, category: FamilyCategory) { return getFamilySnapshots(bridgeId, graphDocumentId).filter(item => item.familyCategory === category).flatMap(item => item.candidates) }
export function markFamilySnapshotsStale(bridgeId: string, graphDocumentId: string, fingerprint: string) { for (const [itemKey, item] of snapshots) if (item.bridgeId === bridgeId && item.graphDocumentId === graphDocumentId && item.graphFingerprint !== fingerprint) snapshots.set(itemKey, { ...item, freshness: 'STALE' as SnapshotFreshness }) }
export function clearFamilySnapshots() { snapshots.clear() }
