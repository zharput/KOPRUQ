import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import BigMenuPanel from './components/BigMenuPanel'
import PlaceholderPanel from './components/PlaceholderPanel'
import type { SectionId } from './navigation/sections'
import { BIG_MENU_ITEMS, WORKING_SECTIONS } from './navigation/sections'
import { ProjectPanel, ProjectDashboardPanel, type BridgeRow } from '../features/project'
import { SiteLayoutPanel, type LayoutSeed } from '../features/layout-generator'
import { FastSolverPanel } from '../features/spanova-fast-solver'
import { LoadsPanel } from '../features/loads'
import { MaterialsPanel } from '../features/materials'
import { SuperstructureFamiliesPanel, type CrossSectionValues } from '../features/superstructure-families'
import { PierFamiliesPanel } from '../features/pier-families'
import { GirderLibraryPanel } from '../features/girder-library'
import { PreferredSpanPanel } from '../features/preferred-span'
import { GenerateWorkflow, type GenerationSummary } from '../features/bridge-alternatives'
import { CostDatabasePanel } from '../features/cost-database'
import { TerrainDtmPanel } from '../features/terrain-dtm'
import { TerrainViewerPanel } from '../features/terrain-viewer'
import { LandXmlImportPanel } from '../features/landxml-import'
import { PierCapFamiliesPanel } from '../features/pier-cap-families'
import { SystemAssemblyPanel } from '../features/system-assembly'
import { BearingFamiliesPanel } from '../features/bearing-families'
import { FoundationFamiliesPanel } from '../features/foundation-families'
import type { Dispatch, SetStateAction } from 'react'

/**
 * URL-based route table (Milestone 2 of the architecture migration,
 * 2026-09-12) - replaces `App.tsx`'s previous manual `active` state
 * switch with real routing: `/` redirects to `/project`, `/:section`
 * renders whichever screen that SectionId maps to (a working feature,
 * a BigMenuPanel card grid, or an honest PlaceholderPanel), exactly the
 * same branching `App.tsx` used to do inline. The engineer can now
 * deep-link/bookmark/refresh any section, and browser back/forward
 * moves between them - none of that existed with local `useState`.
 *
 * <p>Cross-feature state that isn't URL-shaped (`bridges`, `designCode`,
 * the last `GenerationSummary`, `layoutSeed`) is still owned by `App.tsx`
 * and passed down here as props - the router only decides *which*
 * section is active, it doesn't own any of this session's existing
 * "lift shared state" data.
 */
export default function AppRoutes(props: {
  summary: GenerationSummary | null
  onGenerated: (summary: GenerationSummary) => void
  layoutSeed: LayoutSeed | null
  setLayoutSeed: Dispatch<SetStateAction<LayoutSeed | null>>
  bridges: BridgeRow[]
  setBridges: Dispatch<SetStateAction<BridgeRow[]>>
  designCode: string
  setDesignCode: Dispatch<SetStateAction<string>>
  crossSectionValues: CrossSectionValues
  setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>
  terrainId: string | null
  setTerrainId: Dispatch<SetStateAction<string | null>>
  landXmlImportId: string | null
  setLandXmlImportId: Dispatch<SetStateAction<string | null>>
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/project" replace />} />
      <Route path=":section" element={<SectionRoute {...props} />} />
      <Route path="*" element={<Navigate to="/project" replace />} />
    </Routes>
  )
}

function SectionRoute({
  onGenerated,
  layoutSeed,
  setLayoutSeed,
  bridges,
  setBridges,
  designCode,
  setDesignCode,
  crossSectionValues,
  setCrossSectionValues,
  terrainId,
  setTerrainId,
  landXmlImportId,
  setLandXmlImportId,
}: {
  onGenerated: (summary: GenerationSummary) => void
  layoutSeed: LayoutSeed | null
  setLayoutSeed: Dispatch<SetStateAction<LayoutSeed | null>>
  bridges: BridgeRow[]
  setBridges: Dispatch<SetStateAction<BridgeRow[]>>
  designCode: string
  setDesignCode: Dispatch<SetStateAction<string>>
  crossSectionValues: CrossSectionValues
  setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>
  terrainId: string | null
  setTerrainId: Dispatch<SetStateAction<string | null>>
  landXmlImportId: string | null
  setLandXmlImportId: Dispatch<SetStateAction<string | null>>
}) {
  const { section } = useParams<{ section: string }>()
  const navigate = useNavigate()
  const active = (section ?? 'home') as SectionId
  const bigMenuItems = BIG_MENU_ITEMS[active]

  if (active === 'home') return <Navigate to="/project" replace />
  if (active === 'project-dashboard') return <ProjectDashboardPanel bridges={bridges} designCode={designCode} />
  if (active === 'project-information') {
    return <ProjectPanel bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode} />
  }
  if (active === 'layout-generator') {
    return (
      <SiteLayoutPanel
        onUseLayout={(seed) => {
          setLayoutSeed(seed)
          navigate('/bridge-alternatives')
        }}
      />
    )
  }
  if (active === 'spanova-fast-solver') return <FastSolverPanel />
  if (active === 'loads') return <LoadsPanel crossSectionValues={crossSectionValues} />
  if (active === 'materials') return <MaterialsPanel />
  if (active === 'system-assembly') return <SystemAssemblyPanel />
  if (active === 'cost-database') return <CostDatabasePanel />
  if (active === 'superstructure-families') {
    return <SuperstructureFamiliesPanel crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues} />
  }
  if (active === 'girder-library') return <GirderLibraryPanel />
  if (active === 'preferred-span-families') return <PreferredSpanPanel />
  if (active === 'pier-families') return <PierFamiliesPanel />
  if (active === 'pier-cap-families') return <PierCapFamiliesPanel />
  if (active === 'bearing-families') return <BearingFamiliesPanel />
  if (active === 'foundation-families') return <FoundationFamiliesPanel />
  if (active === 'alignment') {
    return (
      <LandXmlImportPanel
        onImported={(result) => {
          setTerrainId(result.terrainId)
          setLandXmlImportId(result.hasAlignment ? result.landXmlImportId : null)
        }}
      />
    )
  }
  if (active === 'terrain-dtm') {
    return (
      <TerrainDtmPanel
        onImported={(newTerrainId) => {
          setTerrainId(newTerrainId)
          setLandXmlImportId(null)
        }}
      />
    )
  }
  if (active === '3d-visualization') return <TerrainViewerPanel terrainId={terrainId} landXmlImportId={landXmlImportId} />
  if (bigMenuItems) return <BigMenuPanel section={active} items={bigMenuItems} />
  if (WORKING_SECTIONS.has(active)) return <GenerateWorkflow onGenerated={onGenerated} layoutSeed={layoutSeed} />
  return <PlaceholderPanel section={active} />
}
