package com.kopruq.analysis;

/**
 * A two-node elastic-link (spring) element connecting {@code nodeI} to
 * {@code nodeJ} - e.g. an elastomeric bearing (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum P: "bearings as elastic-link elements"). Stiffness values act
 * along the GLOBAL axes (kx/ky/kz translational, krx/kry/krz
 * rotational) - a deliberate simplification: no local-axis rotation is
 * modelled for the link itself, since every bearing modelled so far sits
 * with its natural axes already aligned to the global bridge axes
 * (longitudinal/transverse/vertical). Revisit if a skewed bearing is
 * ever needed.
 *
 * <p>Units: translational stiffness in kN/m, rotational in kN.m/rad -
 * matching the rest of this project's SI (m, kN) convention. Values are
 * always engineer-supplied (spec section 22 - never invented here).
 */
public record ElasticLinkElement(
        int id, int nodeI, int nodeJ,
        double kx, double ky, double kz,
        double krx, double kry, double krz) {
}
