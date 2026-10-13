import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRecentProjectFile, listRecentProjects, recordRecentProject, rememberRecentProject, repairRecentProject } from './recentProjects'

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })
const handle = (permission: PermissionState = 'granted', file = new File(['{}'], 'project.kopruq')) => ({ queryPermission: vi.fn().mockResolvedValue(permission), requestPermission: vi.fn().mockResolvedValue('granted'), getFile: vi.fn().mockResolvedValue(file) }) as unknown as FileSystemFileHandle

describe('Recent Projects repository', () => {
  it('creates a metadata record and reads it back', async () => { const records = await rememberRecentProject('Bridge', 'Bridge.kopruq', handle()); expect(records[0].projectName).toBe('Bridge'); expect(records[0].fileName).toBe('Bridge.kopruq') })
  it('keeps at most five records and newest first', async () => { for (let i = 0; i < 6; i++) await rememberRecentProject(`P${i}`, `P${i}.kopruq`, handle()); const records = await listRecentProjects(); expect(records).toHaveLength(5); expect(records[0].fileName).toBe('P5.kopruq'); expect(records.some((item) => item.fileName === 'P0.kopruq')).toBe(false) })
  it('removes legacy overflow records when the repository is read', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); localStorage.setItem('kopruq.recent-projects.metadata.v1', JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ id: `old-${i}`, projectName: `P${i}`, fileName: `P${i}.kopruq`, lastUsedAt: new Date(2026, 0, i + 1).toISOString(), available: false })))); const records = await listRecentProjects(); expect(records).toHaveLength(5); expect(JSON.parse(localStorage.getItem('kopruq.recent-projects.metadata.v1') ?? '[]')).toHaveLength(5) })
  it('updates metadata for the same file identity in fallback storage', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); await rememberRecentProject('Old', 'same.kopruq'); await rememberRecentProject('New', 'same.kopruq'); const records = await listRecentProjects(); expect(records.filter((item) => item.fileName === 'same.kopruq')).toHaveLength(1); expect(records[0].projectName).toBe('New') })
  it('uses metadata fallback when IndexedDB is unavailable', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); await rememberRecentProject('Fallback', 'fallback.kopruq'); expect((await listRecentProjects())[0].available).toBe(false) })
  it('does not duplicate a file and moves it to the top when reused', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); await rememberRecentProject('First', 'first.kopruq'); await rememberRecentProject('Second', 'second.kopruq'); await rememberRecentProject('First Updated', 'first.kopruq'); const records = await listRecentProjects(); expect(records.filter((item) => item.fileName === 'first.kopruq')).toHaveLength(1); expect(records[0].fileName).toBe('first.kopruq'); expect(records[0].projectName).toBe('First Updated') })
  it('preserves independent handles for five records when another record is updated', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); const handles = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ token: name }) as unknown as FileSystemFileHandle); for (let i = 0; i < handles.length; i++) await rememberRecentProject(String.fromCharCode(65 + i), `${String.fromCharCode(65 + i)}.kopruq`, handles[i]); await rememberRecentProject('B updated', 'B.kopruq'); const records = await listRecentProjects(); expect(records).toHaveLength(5); expect(records.find((record) => record.fileName === 'B.kopruq')?.projectName).toBe('B updated') })
  it('reads a granted file handle', async () => { const entry = { id: 'x', projectName: 'P', fileName: 'p.kopruq', lastUsedAt: new Date().toISOString(), available: true, handle: handle() }; expect(await getRecentProjectFile(entry)).toBeInstanceOf(File) })
  it('requests permission for a prompt handle', async () => { const h = handle('prompt') as FileSystemFileHandle & { requestPermission: ReturnType<typeof vi.fn> }; const entry = { id: 'x', projectName: 'P', fileName: 'p.kopruq', lastUsedAt: '', available: true, handle: h }; await getRecentProjectFile(entry); expect(h.requestPermission).toHaveBeenCalled() })
  it('rejects denied permission and cancelled permission', async () => { const denied = { id: 'x', projectName: 'P', fileName: 'p.kopruq', lastUsedAt: '', available: true, handle: handle('denied') }; await expect(getRecentProjectFile(denied)).rejects.toThrow('permission'); const cancelled = handle('prompt') as FileSystemFileHandle & { requestPermission: ReturnType<typeof vi.fn> }; cancelled.requestPermission.mockRejectedValue(new DOMException('cancelled', 'AbortError')); await expect(getRecentProjectFile({ ...denied, handle: cancelled })).rejects.toThrow('cancelled') })
  it('propagates missing, moved and unreadable file errors', async () => { const h = handle(); (h.getFile as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('NotFound', 'NotFoundError')); await expect(getRecentProjectFile({ id: 'x', projectName: 'P', fileName: 'p.kopruq', lastUsedAt: '', available: true, handle: h })).rejects.toThrow('NotFound') })
  it('does not inherit another file handle when a same-named file is remembered without a handle', async () => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); await rememberRecentProject('X', 'Bridge.kopruq', handle()); await rememberRecentProject('X', 'Bridge.kopruq'); const record = (await listRecentProjects()).find((item) => item.fileName === 'Bridge.kopruq')!; expect(record.available).toBe(false); expect(record.handle).toBeUndefined(); expect(record.accessMode).toBe('metadata-only') })
})

/** A fake file handle whose isSameEntry says "same" only for itself, or for handles listed in `sameAs`. */
const entryHandle = (name: string, sameAs: FileSystemFileHandle[] = []) => { const self = { name, kind: 'file', isSameEntry: vi.fn(async (other: unknown) => other === self || sameAs.includes(other as FileSystemFileHandle)) }; return self as unknown as FileSystemFileHandle & { isSameEntry: ReturnType<typeof vi.fn> } }
const noIdb = () => Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined })

describe('Recent Projects identity (C-013-03)', () => {
  it('gives a new record an id that is not the file name', async () => {
    noIdb(); const { id, recent } = await recordRecentProject('P', 'Fresh.kopruq', entryHandle('Fresh.kopruq'))
    expect(id).not.toBe('Fresh.kopruq'); expect(recent[0].id).toBe(id); expect(recent[0].fileName).toBe('Fresh.kopruq')
  })
  it('keeps two different files with the same name as two records, each with its own handle', async () => {
    noIdb(); const x = entryHandle('Bridge.kopruq'), y = entryHandle('Bridge.kopruq')
    const first = await recordRecentProject('X project', 'Bridge.kopruq', x); const second = await recordRecentProject('Y project', 'Bridge.kopruq', y)
    expect(second.id).not.toBe(first.id)
    const records = await listRecentProjects(); expect(records).toHaveLength(2)
    expect(records.find((r) => r.id === first.id)?.handle).toBe(x); expect(records.find((r) => r.id === second.id)?.handle).toBe(y)
  })
  it('updates one record when isSameEntry says it is the same file', async () => {
    noIdb(); const original = entryHandle('Bridge.kopruq'), reopened = entryHandle('Bridge.kopruq', [original])
    const first = await recordRecentProject('Old name', 'Bridge.kopruq', original); const second = await recordRecentProject('New name', 'Bridge.kopruq', reopened)
    expect(second.id).toBe(first.id); const records = await listRecentProjects(); expect(records).toHaveLength(1); expect(records[0].projectName).toBe('New name'); expect(records[0].handle).toBe(reopened)
  })
  it('treats a failing or missing isSameEntry as no match', async () => {
    noIdb(); const broken = entryHandle('A.kopruq'); broken.isSameEntry.mockRejectedValue(new Error('boom')); const plain = { name: 'A.kopruq' } as unknown as FileSystemFileHandle
    const first = await recordRecentProject('A', 'A.kopruq', broken); const second = await recordRecentProject('A', 'A.kopruq', plain)
    expect(second.id).not.toBe(first.id); expect(await listRecentProjects()).toHaveLength(2)
  })
  it('merges a handle-less open only with a handle-less record of the same name and never touches a handle record', async () => {
    noIdb(); const handleBacked = entryHandle('Bridge.kopruq')
    const withHandle = await recordRecentProject('With handle', 'Bridge.kopruq', handleBacked)
    const plainA = await recordRecentProject('Plain', 'Bridge.kopruq'); const plainB = await recordRecentProject('Plain again', 'Bridge.kopruq')
    expect(plainA.id).not.toBe(withHandle.id); expect(plainB.id).toBe(plainA.id)
    const records = await listRecentProjects(); expect(records).toHaveLength(2)
    const kept = records.find((r) => r.id === withHandle.id)!; expect(kept.projectName).toBe('With handle'); expect(kept.handle).toBe(handleBacked)
    expect(records.find((r) => r.id === plainA.id)?.projectName).toBe('Plain again')
  })
  it('updates the record named by recentId (Save) and does not bind a Save As target to it', async () => {
    noIdb(); const original = entryHandle('Bridge.kopruq')
    const first = await recordRecentProject('P', 'Bridge.kopruq', original)
    const saved = await recordRecentProject('P v2', 'Bridge.kopruq', original, first.id); expect(saved.id).toBe(first.id)
    const copy = entryHandle('Copy.kopruq'); const saveAs = await recordRecentProject('P copy', 'Copy.kopruq', copy)
    expect(saveAs.id).not.toBe(first.id)
    const records = await listRecentProjects(); expect(records).toHaveLength(2); expect(records.find((r) => r.id === first.id)?.projectName).toBe('P v2')
  })
  it('repairs the selected record, not another record with the same name', async () => {
    noIdb(); const a = await recordRecentProject('A', 'Same.kopruq'); const b = await recordRecentProject('B', 'Same.kopruq', entryHandle('Same.kopruq'))
    expect(b.id).not.toBe(a.id)
    const entryA = (await listRecentProjects()).find((r) => r.id === a.id)!
    const picked = entryHandle('Same.kopruq'); await repairRecentProject(entryA, picked)
    const records = await listRecentProjects(); expect(records).toHaveLength(2)
    expect(records.find((r) => r.id === a.id)?.handle).toBe(picked); expect(records.find((r) => r.id === a.id)?.projectName).toBe('A'); expect(records.find((r) => r.id === b.id)?.handle).not.toBe(picked)
  })
  it('lists and updates a legacy record whose id is the file name', async () => {
    noIdb(); localStorage.setItem('kopruq.recent-projects.metadata.v1', JSON.stringify([{ id: 'Legacy.kopruq', projectName: 'Legacy', fileName: 'Legacy.kopruq', lastUsedAt: '2026-01-01T00:00:00.000Z', available: false }]))
    expect((await listRecentProjects())[0].id).toBe('Legacy.kopruq')
    const updated = await recordRecentProject('Legacy v2', 'Legacy.kopruq', undefined, 'Legacy.kopruq'); expect(updated.id).toBe('Legacy.kopruq')
    const records = await listRecentProjects(); expect(records).toHaveLength(1); expect(records[0].projectName).toBe('Legacy v2')
  })
  it('keeps the metadata key and the rememberRecentProject list contract', async () => {
    noIdb(); const records = await rememberRecentProject('P', 'Key.kopruq'); expect(records[0].fileName).toBe('Key.kopruq')
    expect(JSON.parse(localStorage.getItem('kopruq.recent-projects.metadata.v1') ?? '[]')).toHaveLength(1)
  })
})
