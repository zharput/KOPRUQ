import type { GenerationSummary } from '../../features/bridge-alternatives'

/**
 * Home (spec section 20, P10 shell). One real thing: a bridge summary +
 * Alternative Overview funnel, but ONLY once the engineer has actually
 * run GENERATE on the Bridge Alternatives tab (no invented placeholder
 * numbers before that - "(not generated yet)", matching the pattern
 * already used on that tab). Analyzed/Pareto are always 0: P07 (MIDAS
 * analysis) and P09 (optimization) don't exist yet, shown as real
 * zeros, not hidden.
 *
 * <p>The mockup's Quick Actions list was removed 2026-09-12 (engineer's
 * own instruction - "HOME sayfasındaki butonların hepsini siilelim").
 * "Import Alignment"/"Import Terrain" moved into their matching Site &
 * Corridor leaves (see `app/router.tsx`'s `alignment`/`terrain-dtm`
 * branches) rather than being deleted outright.
 *
 * <p>Lives under `pages/` (architecture migration, 2026-09-12): it's the
 * one screen that reads across a feature boundary (bridge-alternatives'
 * results) to build a summary, which is exactly what `pages/` composition
 * is for - every other section renders straight from its own feature.
 */
export default function HomePanel({ summary }: { summary: GenerationSummary | null }) {
  return (
    <div className="spn-home">
      <h1>Welcome to SPANOVA</h1>
      <p className="spn-home-intro">
        Use <strong>Layout Generator</strong> (Bridges) to find candidate span arrangements, then{' '}
        <strong>Bridge Alternatives</strong> to produce feasible structural alternatives.
      </p>

      {summary ? (
        <>
          <h2 className="spn-home-section-title">Current bridge</h2>
          <div className="spn-bridge-summary">
            <SummaryStat label="Bridge" value={summary.bridgeName} />
            <SummaryStat label="Total length" value={`${summary.totalLengthM} m`} />
            <SummaryStat label="Deck width" value={`${summary.deckWidthM} m`} />
            <SummaryStat label="Bridge type" value="Precast girder" />
          </div>

          <h2 className="spn-home-section-title">Alternative overview</h2>
          <div className="spn-funnel">
            <FunnelStat label="Generated" value={summary.generatedCount} />
            <FunnelStat label="Feasible" value={summary.feasibleCount} />
            <FunnelStat label="Analyzed" value={summary.analyzedCount} note="P07" />
            <FunnelStat label="Pareto" value={summary.paretoCount} note="P09" />
          </div>
        </>
      ) : (
        <p className="spn-home-empty">(not generated yet - run GENERATE ALTERNATIVES on the Bridge Alternatives tab)</p>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="spn-stat">
      <span className="spn-stat-label">{label}</span>
      <span className="spn-stat-value">{value}</span>
    </div>
  )
}

function FunnelStat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="spn-stat">
      <span className="spn-stat-value">{value}</span>
      <span className="spn-stat-label">{label}{note ? ` (${note})` : ''}</span>
    </div>
  )
}
