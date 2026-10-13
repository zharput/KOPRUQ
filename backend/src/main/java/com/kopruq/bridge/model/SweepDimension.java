package com.kopruq.bridge.model;

/** A named min/max/delta sweep dimension; its unit is only in the label text. */
public record SweepDimension(String key, String label, double min, double max, double delta) {

    public SweepDimension {
        SectionInvariants.required("key", key);
        SectionInvariants.required("label", label);
        SectionInvariants.finite("min", min);
        SectionInvariants.finite("max", max);
        SectionInvariants.finite("delta", delta);
    }
}
