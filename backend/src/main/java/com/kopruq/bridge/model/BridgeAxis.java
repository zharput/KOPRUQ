package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.BridgeAxisType;

/** One axis (abutment or pier) of a bridge definition. Chainage and elevation in metres, skew in degrees. */
public record BridgeAxis(String id, String name, BridgeAxisType type, double chainageM, Double elevationM,
        Double skewDegrees) {

    public BridgeAxis {
        SectionInvariants.required("id", id);
        SectionInvariants.required("name", name);
        SectionInvariants.required("type", type);
        SectionInvariants.finite("chainageM", chainageM);
        SectionInvariants.finiteOrNull("elevationM", elevationM);
        SectionInvariants.finiteOrNull("skewDegrees", skewDegrees);
    }
}
