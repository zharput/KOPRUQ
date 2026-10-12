package com.kopruq.loads.domain;

import com.kopruq.loads.model.WindRequest;
import com.kopruq.loads.model.WindResult;

/**
 * EN 1991-1-4 terrain profile and bridge-deck transverse action, base rules only.
 *
 * <p>Fail-closed input domain (BACKEND-REMEDIATION Faz 1): {@code vb}, {@code ze},
 * deck width and {@code dref} must be finite; {@code vb}, deck width and
 * {@code dref} must be positive; {@code ze} must not be negative; the terrain
 * category must be one of 0, I, II, III, IV. Violations return an
 * {@code INVALID} result (never an exception). The engineering constants
 * below are unchanged.
 */
public final class WindLoadsService {

    public WindResult resolve(WindRequest r) {
        if (r == null || !positiveFinite(r.vbMs()) || !finite(r.zeM()) || r.zeM() < 0
                || !positiveFinite(r.deckWidthM()) || !positiveFinite(r.drefM())) {
            return new WindResult("INVALID", 0, 0, 0, 0, 0, 0, 0, 0, 1.3, null,
                    "vb, ze, deck width and dref are required, finite and positive (ze not negative)");
        }
        double[] p = terrainParameters(r.terrainCategory());
        if (p == null) {
            return new WindResult("INVALID", 0, 0, 0, 0, 0, 0, 0, 0, 1.3, null, "invalid terrain category");
        }
        double kr = .19 * Math.pow(p[0] / .05, .07), z = Math.max(r.zeM(), p[1]);
        double cr = kr * Math.log(z / p[0]), vm = cr * r.vbMs(), iv = 1 / Math.log(z / p[0]);
        double qp = (1 + 7 * iv) * .5 * 1.25 * vm * vm / 1000;
        double cfx = 1.3, load = qp * cfx * r.drefM();
        return new WindResult("VALID", p[0], p[1], kr, cr, vm, iv, qp, r.deckWidthM() / r.drefM(), cfx, load, null);
    }

    private static double[] terrainParameters(String category) {
        if (category == null) {
            return null;
        }
        return switch (category) {
            case "0" -> new double[] {.003, 1};
            case "I" -> new double[] {.01, 1};
            case "II" -> new double[] {.05, 2};
            case "III" -> new double[] {.3, 5};
            case "IV" -> new double[] {1, 10};
            default -> null;
        };
    }

    private static boolean finite(Double v) {
        return v != null && Double.isFinite(v);
    }

    private static boolean positiveFinite(Double v) {
        return finite(v) && v > 0;
    }
}
