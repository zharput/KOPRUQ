package com.spanova.trafficloads;

/** Where an engineering parameter's current value came from - never silently overwritten without this staying traceable (spec section 22). */
public enum ParameterProvenance {
    CODE_DEFAULT,
    NATIONAL_ANNEX,
    PROJECT_OVERRIDE
}
