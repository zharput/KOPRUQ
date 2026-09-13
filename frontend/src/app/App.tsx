import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import './styles/App.css'
import AppProviders from './providers/AppProviders'
import Sidebar from './layout/Sidebar'
import TopBar from './layout/TopBar'
import AppRoutes from './router'
import { INITIAL_BRIDGES, type BridgeRow } from '../features/project'
import type { GenerationSummary } from '../features/bridge-alternatives'
import type { LayoutSeed } from '../features/layout-generator'
import { INITIAL_CROSS_SECTION_VALUES, type CrossSectionValues } from '../features/superstructure-families'

/**
 * P10 shell (spec section 20), navigation matching the engineer's full
 * menu screenshots (2026-09-10, docs/architecture.md's matching
 * sections): standalone "Home" + 6 collapsible groups (Project, Site &
 * Corridor, Design System, Bridges, Analysis, Optimization) + standalone
 * "3D & Visualization"/"Reports" + footer (Settings/Help).
 *
 * <p>Architecture migration (2026-09-12): Milestone 1 moved every screen
 * under `features/<domain>/`/`pages/`; Milestone 2 replaces the previous
 * manual `active`-state switch with real URL routing (`app/router.tsx`)
 * - `App.tsx` now only owns providers, the router, and the cross-feature
 * state that isn't URL-shaped (`bridges`/`designCode`, the last GENERATE
 * run's summary, the last Site & Layout candidate picked) - same "lift
 * shared state" pattern this session has used all along, just passed
 * into `AppRoutes` instead of read via a local `active` ternary here.
 * Sidebar/TopBar no longer take `active`/`onSelect` props - they read
 * the active section from the URL themselves (`useParams`) and navigate
 * with real `<Link>`s.
 */
function App() {
  const [summary, setSummary] = useState<GenerationSummary | null>(null)
  const [layoutSeed, setLayoutSeed] = useState<LayoutSeed | null>(null)
  const [bridges, setBridges] = useState<BridgeRow[]>(INITIAL_BRIDGES)
  const [designCode, setDesignCode] = useState('Eurocode')
  const [crossSectionValues, setCrossSectionValues] = useState<CrossSectionValues>(INITIAL_CROSS_SECTION_VALUES)

  return (
    <AppProviders>
      <BrowserRouter>
        <div className="spn-shell">
          <Sidebar />
          <div className="spn-main">
            <TopBar />
            <main className="spn-content">
              <AppRoutes
                summary={summary}
                onGenerated={setSummary}
                layoutSeed={layoutSeed}
                setLayoutSeed={setLayoutSeed}
                bridges={bridges}
                setBridges={setBridges}
                designCode={designCode}
                setDesignCode={setDesignCode}
                crossSectionValues={crossSectionValues}
                setCrossSectionValues={setCrossSectionValues}
              />
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
