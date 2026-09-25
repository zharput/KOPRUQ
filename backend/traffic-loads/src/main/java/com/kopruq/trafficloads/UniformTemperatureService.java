package com.kopruq.trafficloads;

import java.util.ArrayList;

/** EN 1991-1-5 boundary: unresolved parameters are reported, never guessed. */
public final class UniformTemperatureService {
    public UniformTemperatureResult resolve(UniformTemperatureRequest request) {
        var missing = new ArrayList<String>();
        if (request == null || request.effectiveMinimumTemperatureC() == null) missing.add("effectiveMinimumTemperatureC (Te,min)");
        if (request == null || request.effectiveMaximumTemperatureC() == null) missing.add("effectiveMaximumTemperatureC (Te,max)");
        if (request == null || request.initialTemperatureC() == null) missing.add("initialTemperatureC (T0)");
        if (request != null && request.effectiveMinimumTemperatureC() != null && request.effectiveMaximumTemperatureC() != null
                && request.effectiveMinimumTemperatureC() > request.effectiveMaximumTemperatureC()) {
            missing.add("Te,min must be less than Te,max");
        }
        Double effectiveMin = request != null ? request.effectiveMinimumTemperatureC() : null;
        Double effectiveMax = request != null ? request.effectiveMaximumTemperatureC() : null;
        Double t0 = request != null ? request.initialTemperatureC() : null;
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
