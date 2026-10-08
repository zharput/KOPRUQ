import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { applyProjectFile, buildProjectFile, readProjectFile, writeProjectFile, type FileRef } from './projectFileService'
import type { WindCalculationSnapshot } from './projectFileTypes'
import { listRecentProjects, rememberRecentProject, type RecentProject } from './recentProjects'
export function useProjectFile(projectState: PersistedProjectState, setProjectState: Dispatch<SetStateAction<PersistedProjectState>>, bridgeDefinitions: BridgeDefinitionStore, setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>>, windLoads: WindCalculationSnapshot | null = null, setWindLoads?: (snapshot: WindCalculationSnapshot | null) => void) {
  const [dirty,setDirty]=useState(false),[ref,setRef]=useState<FileRef>(),[menuOpen,setMenuOpen]=useState(false),[recent,setRecent]=useState<RecentProject[]>([]); const importing=useRef(false)
  useEffect(()=>{void listRecentProjects().then(setRecent)},[]); const fingerprint=JSON.stringify([projectState,bridgeDefinitions,windLoads]),savedFingerprint=useRef(fingerprint),changeVersion=useRef(0)
  useEffect(()=>{const mark=()=>{if(!importing.current){changeVersion.current++;setDirty(true)}};window.addEventListener('kopruq:project-data-changed',mark);return()=>window.removeEventListener('kopruq:project-data-changed',mark)},[])
  useEffect(()=>{if(savedFingerprint.current!==fingerprint)setDirty(true)},[fingerprint])
  const save=async(saveAs=false)=>{const start=changeVersion.current;const snapshot=buildProjectFile(projectState,bridgeDefinitions,windLoads);const next=await writeProjectFile(snapshot,saveAs?undefined:ref);setRef(next);setRecent(await rememberRecentProject(snapshot.projectState.project.name||'Untitled',next.name,next.handle));savedFingerprint.current=JSON.stringify([snapshot.projectState,snapshot.bridgeDefinitions,snapshot.modules.windLoads]);if(changeVersion.current===start)setDirty(false)}
  const open=async(file:File,fileRef:FileRef={name:file.name})=>{const next=await readProjectFile(file);importing.current=true;try{applyProjectFile(next);setProjectState(next.projectState);setBridgeDefinitions(next.bridgeDefinitions);setWindLoads?.(next.modules.windLoads ?? null);setRef(fileRef);setRecent(await rememberRecentProject(next.projectState.project.name||'Untitled',fileRef.name,fileRef.handle));savedFingerprint.current=JSON.stringify([next.projectState,next.bridgeDefinitions,next.modules.windLoads]);setDirty(false)}finally{importing.current=false}}
  const resetForNewProject=(nextProjectState:PersistedProjectState,nextBridgeDefinitions:BridgeDefinitionStore)=>{setWindLoads?.(null);setRef(undefined);savedFingerprint.current=JSON.stringify([nextProjectState,nextBridgeDefinitions,null]);setDirty(false);changeVersion.current++}; const closeSession=()=>{setRef(undefined);setDirty(false);setMenuOpen(false);changeVersion.current++}
  return {dirty,ref,recent,projectName:projectState.project.name||'Untitled',fileName:ref?.name,menuOpen,setMenuOpen,save,open,setDirty,resetForNewProject,closeSession}
}
