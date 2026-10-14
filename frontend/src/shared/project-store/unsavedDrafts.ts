/** Editor-only drafts that exist nowhere but in a mounted panel; the browser asks before the tab closes or reloads while one holds edits. */
const dirtyDrafts = new Set<string>()

export function setDraftDirty(id: string, dirty: boolean): void {
  if (dirty) dirtyDrafts.add(id)
  else dirtyDrafts.delete(id)
}

export function hasDirtyDrafts(): boolean {
  return dirtyDrafts.size > 0
}

export const DISCARD_DRAFT_MESSAGE = 'Kaydedilmemiş taslak değişiklikleri kaybolacak. Devam etmek istiyor musunuz?'

/** In-app counterpart of the unload prompt: true when nothing would be lost or the user agreed to lose the draft edits. */
export function confirmDiscardDrafts(): boolean {
  return !hasDirtyDrafts() || window.confirm(DISCARD_DRAFT_MESSAGE)
}
