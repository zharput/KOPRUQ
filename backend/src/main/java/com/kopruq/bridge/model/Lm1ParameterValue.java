package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.ParameterProvenance;

/** One traffic-LM1 parameter: its value and code default (either may be null, as in the frontend) and provenance. */
public record Lm1ParameterValue(Double value, ParameterProvenance provenance, Double codeDefaultValue) {

    public Lm1ParameterValue {
        SectionInvariants.finiteOrNull("value", value);
        SectionInvariants.required("provenance", provenance);
        SectionInvariants.finiteOrNull("codeDefaultValue", codeDefaultValue);
    }
}
