package com.kopruq.bridge.model;

/** A traffic-LM1 lane factor: a label, a characteristic value and an adjustment factor. The label need not be unique. */
public record Lm1LaneFactor(String label, Lm1ParameterValue characteristicValue, Lm1ParameterValue adjustmentFactor) {

    public Lm1LaneFactor {
        SectionInvariants.required("label", label);
        SectionInvariants.required("characteristicValue", characteristicValue);
        SectionInvariants.required("adjustmentFactor", adjustmentFactor);
    }
}
