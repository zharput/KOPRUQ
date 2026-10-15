package com.kopruq.bridge.model;

/**
 * Temperature inputs as text; never interpreted here. The frontend stores them canonical, in degrees Celsius,
 * whatever temperature unit the project prefers (the unit preferences are display-only).
 */
public record TemperatureInputs(String min, String max, String t0) {

    public TemperatureInputs {
        SectionInvariants.required("min", min);
        SectionInvariants.required("max", max);
        SectionInvariants.required("t0", t0);
    }
}
