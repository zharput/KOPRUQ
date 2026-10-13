package com.kopruq.bridge.model;

/** The family choices and free-text settings of one axis; the axis id must not be blank. Metres where named. */
public record AxisFamilyAssignment(String axisId, String pierFamilyId, Double pierHeightM, String pierCapFamilyId,
        String foundationFamilyId, Double foundationElevationM, String soilReference, String bearingFamilyId,
        Double bearingQuantity, String bearingOrientation, String longitudinalBehavior, String transverseBehavior) {

    public AxisFamilyAssignment {
        SectionInvariants.notBlank("axisId", axisId);
        SectionInvariants.finiteOrNull("pierHeightM", pierHeightM);
        SectionInvariants.finiteOrNull("foundationElevationM", foundationElevationM);
        SectionInvariants.finiteOrNull("bearingQuantity", bearingQuantity);
        SectionInvariants.required("soilReference", soilReference);
        SectionInvariants.required("bearingOrientation", bearingOrientation);
        SectionInvariants.required("longitudinalBehavior", longitudinalBehavior);
        SectionInvariants.required("transverseBehavior", transverseBehavior);
    }
}
