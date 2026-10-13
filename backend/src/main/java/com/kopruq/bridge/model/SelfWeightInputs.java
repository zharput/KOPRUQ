package com.kopruq.bridge.model;

/**
 * Self-weight / permanent-load inputs. Field names are the frontend ones: thicknesses and widths in metres
 * ({@code ...M}), unit weights in kN/m3, unit loads in kN/m; counts are unitless. Values pass through untouched.
 */
public record SelfWeightInputs(double asphaltThicknessM, double asphaltUnitWeightKNm3, double sidewalkThicknessM,
        double sidewalkUnitWeightKNm3, double faciaCount, double faciaWidthM, double faciaThicknessM,
        double faciaUnitWeightKNm3, double guardrailCount, double guardrailUnitLoadKNm,
        double pedestrianRailingCount, double pedestrianRailingUnitLoadKNm, double protectiveFenceCount,
        double protectiveFenceUnitLoadKNm, double soundPanelCount, double soundPanelUnitLoadKNm) {

    public SelfWeightInputs {
        SectionInvariants.finite("asphaltThicknessM", asphaltThicknessM);
        SectionInvariants.finite("asphaltUnitWeightKNm3", asphaltUnitWeightKNm3);
        SectionInvariants.finite("sidewalkThicknessM", sidewalkThicknessM);
        SectionInvariants.finite("sidewalkUnitWeightKNm3", sidewalkUnitWeightKNm3);
        SectionInvariants.finite("faciaCount", faciaCount);
        SectionInvariants.finite("faciaWidthM", faciaWidthM);
        SectionInvariants.finite("faciaThicknessM", faciaThicknessM);
        SectionInvariants.finite("faciaUnitWeightKNm3", faciaUnitWeightKNm3);
        SectionInvariants.finite("guardrailCount", guardrailCount);
        SectionInvariants.finite("guardrailUnitLoadKNm", guardrailUnitLoadKNm);
        SectionInvariants.finite("pedestrianRailingCount", pedestrianRailingCount);
        SectionInvariants.finite("pedestrianRailingUnitLoadKNm", pedestrianRailingUnitLoadKNm);
        SectionInvariants.finite("protectiveFenceCount", protectiveFenceCount);
        SectionInvariants.finite("protectiveFenceUnitLoadKNm", protectiveFenceUnitLoadKNm);
        SectionInvariants.finite("soundPanelCount", soundPanelCount);
        SectionInvariants.finite("soundPanelUnitLoadKNm", soundPanelUnitLoadKNm);
    }
}
