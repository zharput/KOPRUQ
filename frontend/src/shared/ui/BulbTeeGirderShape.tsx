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

/** Canonical outline shared by Family Tables and Graph Inspector. */
export function bulbTeeGirderPath(values: { H:number; tf:number; bf:number; w:number; th1:number; th2:number; bh1:number; bh2:number }) {
  const { H, tf, bf, w, th1, th2, bh1, bh2 } = values
  const scale = Math.max(H, 1e-9)
  const top = tf / scale, bottom = bf / scale, web = w / scale
  const y1 = th1 / scale, y2 = (th1 + th2) / scale, y3 = (H - bh1 - bh2) / scale, y4 = (H - bh1) / scale
  const x = (width:number) => 0.5 - width / (2 * scale)
  const X = (width:number) => 0.5 + width / (2 * scale)
  return `M${x(top)} 0 H${X(top)} V${y1} L${X(web)} ${y2} V${y3} L${X(bottom)} ${y4} V1 H${x(bottom)} V${y4} L${x(web)} ${y3} V${y2} L${x(top)} ${y1} Z`
}
