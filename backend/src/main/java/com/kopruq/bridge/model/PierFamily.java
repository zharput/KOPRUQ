package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.PierFamilyType;

import java.util.List;

/**
 * A pier family as stored by the frontend. Only {@code id} is required; every other field may be absent, and an
 * absent list (null) differs from an empty one. Heights of {@link HeightApplicability} in metres.
 */
public record PierFamily(String id, String name, PierFamilyType pierType, Boolean enabled,
        List<SweepDimension> dimensions, List<String> allowedConfigurations, SweepDimension twoColumnSpacing,
        HeightApplicability heightApplicability, String source) {

    /** Height applicability of a pier family (metres); each value may be absent. */
    public record HeightApplicability(Double minimumHeight, Double preferredHeightMin, Double preferredHeightMax,
            Double maximumHeight) {

        public HeightApplicability {
            SectionInvariants.finiteOrNull("minimumHeight", minimumHeight);
            SectionInvariants.finiteOrNull("preferredHeightMin", preferredHeightMin);
            SectionInvariants.finiteOrNull("preferredHeightMax", preferredHeightMax);
            SectionInvariants.finiteOrNull("maximumHeight", maximumHeight);
        }
    }

    public PierFamily {
        SectionInvariants.notBlank("id", id);
        dimensions = SectionInvariants.copyNonNullOrNull("dimensions", dimensions);
        allowedConfigurations = SectionInvariants.copyNonNullOrNull("allowedConfigurations", allowedConfigurations);
    }
}
