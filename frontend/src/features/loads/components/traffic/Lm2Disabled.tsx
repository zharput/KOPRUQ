/**
 * Traffic > LM2 - visible in the menu but deliberately non-functional
 * per the engineer's explicit instruction ("LM2 menüde görünür ama
 * pasif") - no calculation, no activation control, no numeric values.
 * A distinct component (rather than reusing `TrafficPlaceholder`) so
 * this "visible but locked" state reads differently from a plain
 * "not built yet" tab - LM2 is deferred by design, not by build order.
 */
export default function Lm2Disabled() {
  return (
    <div className="spn-card">
      <h2 className="spn-card-title">
        LM2 <span className="spn-badge spn-badge-code" style={{ marginLeft: 8 }}>NOT IMPLEMENTED</span>
      </h2>
      <p className="spn-card-subtitle">
        Single axle load model (EN 1991-2 4.3.3) is out of scope for this milestone. Shown here for menu
        completeness only - no parameters, no calculation, and no activation control exist yet. Coming in a future
        version.
      </p>
    </div>
  )
}
