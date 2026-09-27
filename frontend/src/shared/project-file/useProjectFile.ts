import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { applyProjectFile, buildProjectFile, readProjectFile, writeProjectFile, type FileRef } from './projectFileService'
import { listRecentProjects, rememberRecentProject, type RecentProject } from './recentProjects'
export function useProjectFile(projectState: PersistedProjectState, setProjectState: Dispatch<SetStateAction<PersistedProjectState>>, bridgeDefinitions: BridgeDefinitionStore, setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>>) {
  const [dirty, setDirty] = useState(false), [ref, setRef] = useState<FileRef>(), [menuOpen, setMenuOpen] = useState(false), [recent, setRecent] = useState<RecentProject[]>([]); const importing = useRef(false)
  useEffect(() => { void listRecentProjects().then(setRecent) }, [])
  const fingerprint = JSON.stringify([projectState, bridgeDefinitions]); const savedFingerprint = useRef<string>(fingerprint); const changeVersion = useRef(0)
  useEffect(() => { const mark = () => { if (importing.current) return; changeVersion.current += 1; setDirty(true) }; window.addEventListener('kopruq:project-data-changed', mark); return () => window.removeEventListener('kopruq:project-data-changed', mark) }, [])
  useEffect(() => { if (savedFingerprint.current !== undefined && savedFingerprint.current !== fingerprint) setDirty(true) }, [fingerprint])
  const save = async (saveAs = false) => { const startVersion = changeVersion.current; const snapshot = buildProjectFile(projectState, bridgeDefinitions); const snapshotFingerprint = JSON.stringify([snapshot.projectState, snapshot.bridgeDefinitions]); const next = await writeProjectFile(snapshot, saveAs ? undefined : ref); setRef(next); setRecent(await rememberRecentProject(snapshot.projectState.project.name || 'Untitled', next.name, next.handle)); savedFingerprint.current = snapshotFingerprint; if (changeVersion.current === startVersion) setDirty(false) }
  const open = async (file: File) => { const next = await readProjectFile(file); importing.current = true; try { applyProjectFile(next); setProjectState(next.projectState); setBridgeDefinitions(next.bridgeDefinitions); const nextRef = { name: file.name }; setRef(nextRef); setRecent(await rememberRecentProject(next.projectState.project.name || 'Untitled', file.name)); savedFingerprint.current = JSON.stringify([next.projectState, next.bridgeDefinitions]); setDirty(false) } finally { importing.current = false } }
  return { dirty, ref, recent, projectName: projectState.project.name || 'Untitled', fileName: ref ? `${ref.name}${dirty ? ' *' : ''}` : dirty ? 'Untitled *' : undefined, menuOpen, setMenuOpen, save, open, setDirty }
}
