package com.kopruq.alignment;

import java.util.List;

/**
 * A vertical alignment profile - the vertical-model counterpart to
 * {@link Alignment} that has been explicitly deferred since SITE-P01
 * ("no vertical alignment model exists yet - elevation is always
 * supplied directly by the caller"). LANDXML-P01 (docs/roadmap.md)
 * introduces it: a sequence of {@link Pvi}s, with standard, well-known
 * road-geometry formulas (linear grade interpolation between PVIs, a
 * symmetric parabolic vertical curve where a PVI declares
 * {@code curveLengthM > 0}) - not an invented convention, spec section
 * 22.
 *
 * <p>{@link Alignment#toXYZ(double, double, VerticalProfile)} uses this
 * to derive elevation from real imported geometry, additively - the
 * existing {@link Alignment#toXYZ(ChainagePosition)} (caller-supplied
 * elevation) is untouched.
 */
public record VerticalProfile(String name, List<Pvi> pvis) {

    public VerticalProfile {
        if (pvis == null || pvis.size() < 2) {
            throw new IllegalArgumentException("VerticalProfile requires at least 2 PVIs");
        }
    }

    /**
     * Elevation at a chainage: linear grade interpolation on the
     * bracketing PVI-to-PVI segment, or the standard parabolic vertical-
     * curve equation ({@code E = E_BVC + g1*x + ((g2-g1)/(2L))*x^2})
     * when the chainage falls inside an intermediate PVI's curve zone
     * ({@code [PVI.chainageM - L/2, PVI.chainageM + L/2]}).
     */
    public double elevationAt(double chainageM) {
        for (int i = 1; i < pvis.size() - 1; i++) {
            Pvi curvePvi = pvis.get(i);
            if (curvePvi.curveLengthM() > 0) {
                double halfLengthM = curvePvi.curveLengthM() / 2;
                double bvcChainageM = curvePvi.chainageM() - halfLengthM;
                double evcChainageM = curvePvi.chainageM() + halfLengthM;
                if (chainageM >= bvcChainageM && chainageM <= evcChainageM) {
                    double g1 = gradeFraction(pvis.get(i - 1), curvePvi);
                    double g2 = gradeFraction(curvePvi, pvis.get(i + 1));
                    double bvcElevationM = curvePvi.elevationM() - g1 * halfLengthM;
                    double x = chainageM - bvcChainageM;
                    return bvcElevationM + g1 * x + ((g2 - g1) / (2 * curvePvi.curveLengthM())) * x * x;
                }
            }
        }

        for (int i = 0; i < pvis.size() - 1; i++) {
            Pvi a = pvis.get(i);
            Pvi b = pvis.get(i + 1);
            if (chainageM <= b.chainageM()) {
                return a.elevationM() + gradeFraction(a, b) * (chainageM - a.chainageM());
            }
        }

        // beyond the last PVI - extend the final grade
        Pvi secondLast = pvis.get(pvis.size() - 2);
        Pvi last = pvis.get(pvis.size() - 1);
        return last.elevationM() + gradeFraction(secondLast, last) * (chainageM - last.chainageM());
    }

    private static double gradeFraction(Pvi from, Pvi to) {
        double runM = to.chainageM() - from.chainageM();
        return runM == 0 ? 0 : (to.elevationM() - from.elevationM()) / runM;
    }
}
