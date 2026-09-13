/**
 * The precast I/bulb-tee girder outline (flat top cap tapering into a
 * thin web, flaring back out into a flat bottom block), extracted
 * 2026-09-13 from Girder Library's own diagram so Superstructure
 * Families' deck cross section can draw the *same* girder shape at a
 * small scale, undistorted, rather than a different simplified shape -
 * the engineer's own instruction ("kiriş şekillerini girder layouttaki
 * gibi yap"). Domain-free geometry (just an outline at a given
 * position/scale), so it lives in `shared/ui`.
 *
 * <p>Source path is Girder Library's own (`GirderLibraryPanel.tsx`,
 * viewBox 0 0 250 260, top-center at local point (120, 20)) - `x`/`y`
 * here place that same top-center point, `scale` resizes the whole
 * shape uniformly around it.
 */
export function BulbTeeGirderShape({
  x,
  y,
  scale = 1,
  fill = 'var(--accent)',
  fillOpacity = 0.22,
}: {
  x: number
  y: number
  scale?: number
  fill?: string
  fillOpacity?: number
}) {
  return (
    <path
      d="M40,20 H200 V35 L135,70 V170 L180,195 V225 H60 V195 L105,170 V70 L40,35 Z"
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={fill}
      strokeWidth={2 / scale}
      transform={`translate(${x - 120 * scale}, ${y - 20 * scale}) scale(${scale})`}
    />
  )
}
