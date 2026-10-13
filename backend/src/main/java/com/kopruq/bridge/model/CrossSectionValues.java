package com.kopruq.bridge.model;

/** The cross-section values: widths and spacing in metres, the girder count unitless. */
public record CrossSectionValues(double platformWidthM, double leftWalkwayM, double rightWalkwayM,
        double spaceOfGirderM, double numberOfGirders) {

    public CrossSectionValues {
        SectionInvariants.finite("platformWidthM", platformWidthM);
        SectionInvariants.finite("leftWalkwayM", leftWalkwayM);
        SectionInvariants.finite("rightWalkwayM", rightWalkwayM);
        SectionInvariants.finite("spaceOfGirderM", spaceOfGirderM);
        SectionInvariants.finite("numberOfGirders", numberOfGirders);
    }
}
