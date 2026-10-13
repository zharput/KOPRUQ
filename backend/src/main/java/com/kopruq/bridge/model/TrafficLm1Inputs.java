package com.kopruq.bridge.model;

import java.util.List;

/**
 * Traffic-LM1 parameters. Characteristic values are kN (tandem system) or kN/m2 (UDL, remaining area UDL); adjustment
 * factors are unitless. Values pass through untouched.
 */
public record TrafficLm1Inputs(List<Lm1LaneFactor> tandemSystem, List<Lm1LaneFactor> udl,
        Lm1LaneFactor remainingAreaUdl) {

    public TrafficLm1Inputs {
        tandemSystem = SectionInvariants.copyNonNull("tandemSystem", tandemSystem);
        udl = SectionInvariants.copyNonNull("udl", udl);
        SectionInvariants.required("remainingAreaUdl", remainingAreaUdl);
    }
}
