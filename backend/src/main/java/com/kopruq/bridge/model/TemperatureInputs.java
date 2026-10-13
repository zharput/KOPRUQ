package com.kopruq.bridge.model;

/** Temperature inputs exactly as the user typed them (text); never interpreted here. */
public record TemperatureInputs(String min, String max, String t0) {

    public TemperatureInputs {
        SectionInvariants.required("min", min);
        SectionInvariants.required("max", max);
        SectionInvariants.required("t0", t0);
    }
}
