import { CartesianGrid, Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLongitudinalProfile } from '../hooks/useLongitudinalProfile'

/**
 * LANDXML-P01's longitudinal profile chart (docs/roadmap.md section 23)
 * - ground (terrain-queried) vs. design (imported {@code VerticalProfile})
 * elevation along the alignment. The first real use of `recharts`,
 * installed since the frontend architecture migration but flagged as
 * idle until a screen genuinely needed chartable data - this is that
 * need.
 */
export default function LongitudinalProfileChart({ importId }: { importId: string }) {
  const query = useLongitudinalProfile(importId)

  if (query.isPending) {
    return <p className="spn-card-subtitle">Loading profile...</p>
  }
  if (query.isError || !query.data) {
    return (
      <p className="spn-error">
        {query.error instanceof Error ? query.error.message : 'Could not load the longitudinal profile.'}
      </p>
    )
  }

  const points = query.data.map((p) => ({
    chainageM: Math.round(p.chainageM * 100) / 100,
    groundElevationM: p.groundElevationM,
    designElevationM: p.designElevationM,
  }))
  const hasGround = points.some((p) => p.groundElevationM != null)
  const hasDesign = points.some((p) => p.designElevationM != null)

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="chainageM" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Chainage (m)', position: 'insideBottom', offset: -4, fill: 'var(--text-secondary)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={['auto', 'auto']} label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {hasGround && (
            <Line type="monotone" dataKey="groundElevationM" name="Ground (terrain)" stroke="var(--accent)" dot={false} connectNulls />
          )}
          {hasDesign && (
            <Line type="monotone" dataKey="designElevationM" name="Design (profile)" stroke="#ff5a36" dot={false} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
