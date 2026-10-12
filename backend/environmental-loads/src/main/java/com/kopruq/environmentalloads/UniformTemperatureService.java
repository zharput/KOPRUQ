package com.kopruq.environmentalloads;

import java.util.ArrayList;

/** EN 1991-1-5 boundary: unresolved parameters are reported, never guessed. */
public final class UniformTemperatureService {
    public UniformTemperatureResult resolve(UniformTemperatureRequest request) {
        var missing = new ArrayList<String>();
        Double effectiveMin = request != null ? request.effectiveMinimumTemperatureC() : null;
        Double effectiveMax = request != null ? request.effectiveMaximumTemperatureC() : null;
        Double t0 = request != null ? request.initialTemperatureC() : null;
        // A non-finite value (NaN / infinity) is never usable: it is reported and treated as absent.
        if (effectiveMin == null) missing.add("effectiveMinimumTemperatureC (Te,min)");
        else if (!Double.isFinite(effectiveMin)) { missing.add("effectiveMinimumTemperatureC (Te,min) must be a finite number"); effectiveMin = null; }
        if (effectiveMax == null) missing.add("effectiveMaximumTemperatureC (Te,max)");
        else if (!Double.isFinite(effectiveMax)) { missing.add("effectiveMaximumTemperatureC (Te,max) must be a finite number"); effectiveMax = null; }
        if (t0 == null) missing.add("initialTemperatureC (T0)");
        else if (!Double.isFinite(t0)) { missing.add("initialTemperatureC (T0) must be a finite number"); t0 = null; }
        if (effectiveMin != null && effectiveMax != null && effectiveMin > effectiveMax) {
            missing.add("Te,min must be less than Te,max");
        }
        if (effectiveMin != null && effectiveMax != null && t0 != null && (t0 <= effectiveMin || t0 >= effectiveMax)) {
            missing.add("T0 should normally lie between Te,min and Te,max");
        }
        Double contraction = effectiveMin != null && t0 != null ? effectiveMin - t0 : null;
        Double expansion = effectiveMax != null && t0 != null ? effectiveMax - t0 : null;
        String status = missing.isEmpty() ? "VALID" : "INVALID";
        return new UniformTemperatureResult(t0, effectiveMin, effectiveMax, contraction, expansion, "PROJECT_INPUT",
                "EN 1991-1-5", "Not applied", status, missing,
                10e-6, 12e-6, status, "VALID", "VALID");
    }
}
