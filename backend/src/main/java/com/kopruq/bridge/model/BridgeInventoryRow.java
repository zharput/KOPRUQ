package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.BridgeInventoryType;
import com.kopruq.bridge.enums.InventoryPierShape;

import java.util.List;
import java.util.Objects;

/**
 * One row of a project's bridge inventory. Lengths are metres ({@code _m}), girder depths centimetres
 * ({@code Cm}) as entered; no sign or range rule is applied (engineering limits live elsewhere). A null
 * {@code girderDepthCm} (not set) is different from an empty list.
 */
public record BridgeInventoryRow(
        String id,
        String no,
        String km,
        String crossingType,
        double estimatedLengthM,
        double roadWidthM,
        String terrain,
        String status,
        BridgeInventoryType bridgeType,
        List<Double> spansM,
        List<Double> girderDepthCm,
        String girderNote,
        InventoryPierShape pierShape) {

    public BridgeInventoryRow {
        Objects.requireNonNull(id, "id");
        if (id.isBlank()) {
            throw new IllegalArgumentException("bridge id must not be blank");
        }
        Objects.requireNonNull(no, "no");
        Objects.requireNonNull(km, "km");
        Objects.requireNonNull(crossingType, "crossingType");
        Objects.requireNonNull(terrain, "terrain");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(bridgeType, "bridgeType");
        Objects.requireNonNull(pierShape, "pierShape");
        requireFinite(estimatedLengthM, "estimatedLengthM");
        requireFinite(roadWidthM, "roadWidthM");
        Objects.requireNonNull(spansM, "spansM");
        spansM = copyFinite(spansM, "spansM");
        if (girderDepthCm != null) {
            girderDepthCm = copyFinite(girderDepthCm, "girderDepthCm");
        }
    }

    private static void requireFinite(double value, String field) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(field + " must be a finite number");
        }
    }

    private static List<Double> copyFinite(List<Double> values, String field) {
        for (int i = 0; i < values.size(); i++) {
            Double v = values.get(i);
            if (v == null) {
                throw new IllegalArgumentException(field + "[" + i + "] is required");
            }
            if (!Double.isFinite(v)) {
                throw new IllegalArgumentException(field + "[" + i + "] must be a finite number");
            }
        }
        return List.copyOf(values);
    }
}
