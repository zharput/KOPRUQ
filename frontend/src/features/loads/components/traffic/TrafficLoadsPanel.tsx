import { useProjectModule } from '../../../../shared/project-file/useProjectModule'
import { TRAFFIC_LM1_MODULE } from '../../model/loadsProjectModules'
import type { Dispatch, SetStateAction } from 'react'
import TabDetailPanel from '../../../../shared/ui/TabDetailPanel'
import type { DetailCategory } from '../../../../shared/ui/TabDetailPanel'
import type { CrossSectionValues } from '../../../superstructure-families'
import { carriagewayWidthM } from '../../../superstructure-families'
import { useLm1Defaults } from '../../hooks/useLm1Defaults'
import { useResolveTraffic } from '../../hooks/useResolveTraffic'
import type { Lm1Parameters } from '../../api/trafficLoadsService'
import TrafficGeneral from './TrafficGeneral'
import CarriagewayNotionalLanes from './CarriagewayNotionalLanes'
import Lm1Panel from './Lm1Panel'
import Lm2Disabled from './Lm2Disabled'
import LoadGroupsPanel from './LoadGroupsPanel'
import TrafficPreviewValidation from './TrafficPreviewValidation'
import TrafficPlaceholder from './TrafficPlaceholder'

/**
 * Loads > Traffic (TRAFFIC-P01, EN 1991-2, road bridges). Orchestrator
 * for the 10-leaf sub-tab row the engineer specified: owns the LM1
 * edit state (seeded once from the backend's code defaults), computes
 * carriageway geometry from the already-lifted `crossSectionValues`
 * (no duplicate entry), and makes the single consolidated
 * `/api/traffic-loads/resolve` call all sub-tabs read from - no
 * engineering computation happens in this component or its children
 * (plan principle #18).
 */
/** Stable 'nothing stored' fallback for useProjectModule (undefined when no override has been saved). */
const NO_LM1_OVERRIDE = undefined as unknown as Lm1Parameters

export default function TrafficLoadsPanel({ crossSectionValues }: { crossSectionValues: CrossSectionValues }) {
  const { data: lm1Defaults } = useLm1Defaults(3)
  const [storedLm1, storeLm1] = useProjectModule(TRAFFIC_LM1_MODULE, NO_LM1_OVERRIDE)
  // Project override wins; otherwise the backend's code defaults are shown without being written into the project.
  const lm1: Lm1Parameters | null = storedLm1 ?? lm1Defaults ?? null
  const setLm1: Dispatch<SetStateAction<Lm1Parameters | null>> = (update) => {
    const next = typeof update === 'function' ? update(lm1) : update
    if (next) storeLm1(next)
  }

  const carriagewayM = carriagewayWidthM(crossSectionValues)
  const carriageway = {
    deckWidthM: crossSectionValues.platformWidthM,
    leftWalkwayM: crossSectionValues.leftWalkwayM,
    rightWalkwayM: crossSectionValues.rightWalkwayM,
  }

  const { data: resolved, isLoading: isResolving } = useResolveTraffic(carriageway, lm1)

  const categories: DetailCategory[] = [
    { label: 'General', content: <TrafficGeneral /> },
    {
      label: 'Carriageway & Notional Lanes',
      content: (
        <CarriagewayNotionalLanes
          crossSectionValues={crossSectionValues}
          carriagewayM={carriagewayM}
          notionalLanes={resolved?.notionalLanes}
          isLoading={isResolving}
        />
      ),
    },
    {
      label: 'LM1',
      content: lm1 ? (
        <Lm1Panel lm1={lm1} onChange={setLm1} resolved={resolved?.lm1} defaults={lm1Defaults} />
      ) : (
        <p className="spn-card-subtitle">Loading...</p>
      ),
    },
    { label: 'LM2', content: <Lm2Disabled /> },
    {
      label: 'LM3 / Special Vehicles',
      content: <TrafficPlaceholder title="LM3 / Special Vehicles" note="deferred to a future Traffic Loads milestone" />,
    },
    {
      label: 'LM4 / Crowd Loading',
      content: <TrafficPlaceholder title="LM4 / Crowd Loading" note="deferred to a future Traffic Loads milestone" />,
    },
    {
      label: 'Braking & Acc.',
      content: <TrafficPlaceholder title="Braking & Acceleration" note="deferred to a future Traffic Loads milestone" />,
    },
    {
      label: 'Centrifugal',
      content: (
        <TrafficPlaceholder
          title="Centrifugal Forces"
          note="deferred to a future Traffic Loads milestone - needs an Alignment-to-Bridge chainage link first"
        />
      ),
    },
    { label: 'Load Groups', content: <LoadGroupsPanel /> },
    {
      label: 'Preview & Validation',
      content: lm1 ? (
        <TrafficPreviewValidation
          carriagewayM={carriagewayM}
          notionalLanes={resolved?.notionalLanes}
          lm1={lm1}
          validation={resolved?.validation}
        />
      ) : (
        <p className="spn-card-subtitle">Loading...</p>
      ),
    },
  ]

  return <TabDetailPanel className="spn-traffic-workspace" categories={categories} />
}
