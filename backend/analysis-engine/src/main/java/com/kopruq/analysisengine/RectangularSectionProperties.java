package com.kopruq.analysisengine;

import com.kopruq.analysis.AnalysisSection;
import com.kopruq.analysis.SolidRectangleSection;

/**
 * Cross-section properties for a solid rectangle, from standard
 * mechanics-of-materials formulas (not engineering judgment - the same
 * category as choosing the direct-stiffness method itself, so no
 * engineer sign-off is needed per spec section 22's own carve-out for
 * software/computational method choices).
 *
 * <p>Convention: {@link SolidRectangleSection#heightM()} is the
 * dimension along the element's local z-axis, {@code widthM} along local
 * y (matches this project's existing MIDAS "SB" section convention).
 *
 * <p>Only {@link SolidRectangleSection} is supported so far - LAYOUT-P01's
 * test bridge only uses rectangular sections (deck, columns, cap beam).
 * {@link com.kopruq.analysis.ISection}/{@link com.kopruq.analysis.SolidCircularSection}
 * need their own formulas before this engine can use them.
 */
final class RectangularSectionProperties {

    private RectangularSectionProperties() {
    }

    static SectionProperties of(AnalysisSection section) {
        if (section instanceof SolidRectangleSection rect) {
            double h = rect.heightM();
            double b = rect.widthM();
            double area = b * h;
            double iy = b * Math.pow(h, 3) / 12.0;
            double iz = h * Math.pow(b, 3) / 12.0;
            double j = torsionConstant(b, h);
            return new SectionProperties(area, iy, iz, j);
        }
        throw new UnsupportedOperationException(
                "Only SolidRectangleSection is supported by analysis-engine so far - got " + section.getClass().getSimpleName());
    }

    /**
     * Saint-Venant torsion constant for a solid rectangle (Roark's
     * Formulas for Stress and Strain, rectangular-bar torsion table) -
     * {@code short}/{@code long} are the section's short and long side.
     */
    private static double torsionConstant(double b, double h) {
        double shortSide = Math.min(b, h);
        double longSide = Math.max(b, h);
        double ratio = shortSide / longSide;
        return longSide * Math.pow(shortSide, 3)
                * (1.0 / 3.0 - 0.21 * ratio * (1 - Math.pow(ratio, 4) / 12.0));
    }

    /** area (m2), moment of inertia about local y and z (m4), torsion constant (m4). */
    record SectionProperties(double areaM2, double iyM4, double izM4, double jM4) {
    }
}
