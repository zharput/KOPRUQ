export type RecentAccessMode = 'handle' | 'metadata-only'
export type RecentProject = { id:string; projectName:string; fileName:string; lastUsedAt:string; handle?:FileSystemFileHandle; available:boolean; accessMode?:string }
export type RecentAccessFailure = 'HANDLE_MISSING'|'PERMISSION_DENIED'|'FILE_UNAVAILABLE'
export class RecentProjectAccessError extends Error { readonly code:RecentAccessFailure; constructor(code:RecentAccessFailure,message:string){super(message);this.code=code;this.name='RecentProjectAccessError'} }
export const MAX_RECENT_PROJECTS=5
const DB_NAME='kopruq-project-files',STORE='recent-projects',META_KEY='kopruq.recent-projects.metadata.v1',sessionHandles=new Map<string,FileSystemFileHandle>()
const detail=(error:unknown)=>error instanceof DOMException?(error.name==='AbortError'?'cancelled':error.name):error instanceof Error?(error.message||error.name):String(error)
function metadata():RecentProject[]{try{const value=JSON.parse(localStorage.getItem(META_KEY)??'[]');return Array.isArray(value)?value.map((item):RecentProject=>{const handle=sessionHandles.get(item.id);return {...item,handle,available:Boolean(handle),accessMode:handle?'handle':'metadata-only'}}).sort((a,b)=>b.lastUsedAt.localeCompare(a.lastUsedAt)):[]}catch{return[]}}
function saveMetadata(items:RecentProject[]){try{localStorage.setItem(META_KEY,JSON.stringify(items.map(({handle:_handle,...item})=>({...item,accessMode:item.accessMode??'metadata-only'}))))}catch{}}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(new Error('IndexedDB is unavailable.'));const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error('Unable to open Recent Projects storage.'))})}
function readAll(db:IDBDatabase):Promise<RecentProject[]>{return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).getAll();request.onsuccess=()=>resolve((request.result as RecentProject[]).map((item):RecentProject=>{const handle=item.handle??sessionHandles.get(item.id);if(handle)sessionHandles.set(item.id,handle);return {...item,handle,available:Boolean(handle),accessMode:handle?'handle':'metadata-only'}}).sort((a,b)=>b.lastUsedAt.localeCompare(a.lastUsedAt)));request.onerror=()=>reject(request.error)})}
export async function listRecentProjects(){try{const db=await openDb();const records=await readAll(db);db.close();const recent=records.slice(0,MAX_RECENT_PROJECTS),stale=records.slice(MAX_RECENT_PROJECTS);if(stale.length){const cleanup=await openDb();await new Promise<void>((resolve,reject)=>{const tx=cleanup.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);stale.forEach(record=>store.delete(record.id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});cleanup.close()}saveMetadata(recent);return recent}catch{const recent=metadata().slice(0,MAX_RECENT_PROJECTS);saveMetadata(recent);return recent}}
const newRecentId = () => globalThis.crypto?.randomUUID?.() ?? `recent-${Date.now()}-${Math.random().toString(36).slice(2)}`
async function loadRecords(): Promise<RecentProject[]> {
  try { const db = await openDb(); const records = await readAll(db); db.close(); return records } catch { return metadata() }
}
async function isSameFile(candidate: FileSystemFileHandle, stored: FileSystemFileHandle): Promise<boolean> {
  try { return typeof candidate.isSameEntry === 'function' && (await candidate.isSameEntry(stored)) === true } catch { return false }
}
/**
 * Finds the existing record an opened/saved file belongs to. Order: explicit `recentId`; a handle that
 * `isSameEntry` with a stored handle; without a handle only a handle-less record with the same file name
 * (a record that has a handle is never taken over by a handle-less open). The file name alone is never an identity.
 */
async function findRecentMatch(records: RecentProject[], fileName: string, handle?: FileSystemFileHandle, recentId?: string): Promise<RecentProject | undefined> {
  const byId = recentId ? records.find((record) => record.id === recentId) : undefined
  if (byId) return byId
  if (handle) { for (const record of records) if (record.handle && await isSameFile(handle, record.handle)) return record; return undefined }
  return records.find((record) => !record.handle && record.fileName === fileName)
}
/** Records a project file in Recent Projects and returns the id of the record it was stored under, with the updated list. */
export async function recordRecentProject(projectName: string, fileName: string, handle?: FileSystemFileHandle, recentId?: string): Promise<{ id: string; recent: RecentProject[] }> {
  // Matching awaits isSameEntry, so it must finish before any IndexedDB transaction is opened (awaiting inside one would auto-commit it).
  const previous = await findRecentMatch(await loadRecords(), fileName, handle, recentId)
  const id = previous?.id ?? newRecentId()
  if (handle) sessionHandles.set(id, handle); else sessionHandles.delete(id)
  const merged: RecentProject = { ...previous, id, projectName, fileName, lastUsedAt: new Date().toISOString(), handle, available: Boolean(handle), accessMode: handle ? 'handle' : 'metadata-only' }
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'), put = tx.objectStore(STORE).put(merged)
      put.onerror = () => reject(put.error); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    saveMetadata([merged, ...metadata().filter((record) => record.id !== id)].slice(0, MAX_RECENT_PROJECTS))
  }
  return { id, recent: await listRecentProjects() }
}
export async function rememberRecentProject(projectName: string, fileName: string, handle?: FileSystemFileHandle) { return (await recordRecentProject(projectName, fileName, handle)).recent }
export async function repairRecentProject(entry: RecentProject, handle: FileSystemFileHandle) { return (await recordRecentProject(entry.projectName, handle.name, handle, entry.id)).recent }
export async function getRecentProjectFile(entry:RecentProject){const handle=entry.handle??sessionHandles.get(entry.id);if(!handle)throw new RecentProjectAccessError('HANDLE_MISSING','Bu dosya için kayıtlı dosya erişimi bulunamadı.');const candidate=handle as FileSystemFileHandle&{queryPermission?:(options:{mode:'read'})=>Promise<PermissionState>;requestPermission?:(options:{mode:'read'})=>Promise<PermissionState>};try{const permission=candidate.queryPermission?await candidate.queryPermission({mode:'read'}):'prompt';if(permission==='denied')throw new RecentProjectAccessError('PERMISSION_DENIED','permission denied: Bu dosyaya erişim izni verilmedi.');if(permission==='prompt'){const granted=candidate.requestPermission?await candidate.requestPermission({mode:'read'}):'denied';if(granted!=='granted')throw new RecentProjectAccessError('PERMISSION_DENIED','permission denied: Bu dosyaya erişim izni verilmedi.')}return await handle.getFile()}catch(error){if(error instanceof RecentProjectAccessError)throw error;throw new RecentProjectAccessError('FILE_UNAVAILABLE',`Dosyaya erişilemiyor. Dosya taşınmış, silinmiş veya erişim dışı olabilir. ${detail(error)}`)}}
