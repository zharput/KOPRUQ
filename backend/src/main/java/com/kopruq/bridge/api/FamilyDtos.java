package com.kopruq.bridge.api;

import java.util.List;

/**
 * JSON shapes of the five family catalogs. Every field except {@code id} is optional (the frontend stores partial
 * records); an absent field reads back as an explicit null. Enums travel as constant names. Rule units follow the
 * family: pier cap and foundation metres, bearing millimetres, pier heights metres.
 */
public final class FamilyDtos {

    private FamilyDtos() {
    }

    public record RangeRuleDto(Double min, Double max, Double delta) {
    }

    public record SweepDimensionDto(String key, String label, Double min, Double max, Double delta) {
    }

    public record HeightApplicabilityDto(Double minimumHeight, Double preferredHeightMin, Double preferredHeightMax,
            Double maximumHeight) {
    }

    public record PierFamilyDto(String id, String name, String pierType, Boolean enabled, String source,
            List<SweepDimensionDto> dimensions, List<String> allowedConfigurations,
            SweepDimensionDto twoColumnSpacing, HeightApplicabilityDto heightApplicability) {
    }

    public record PierCapFamilyDto(String id, String name, String capType, String compatiblePierConfiguration,
            Boolean enabled, String source, RangeRuleDto capTransverseLength, RangeRuleDto capStructuralHeight,
            RangeRuleDto stemWidth) {
    }

    public record ShallowGenerationDto(RangeRuleDto lengthX, RangeRuleDto lengthY, RangeRuleDto height) {
    }

    public record PiledGenerationDto(RangeRuleDto pileDiameter, RangeRuleDto pileCountX, RangeRuleDto pileSpacingX,
            RangeRuleDto pileCountY, RangeRuleDto pileSpacingY, RangeRuleDto height) {
    }

    public record FoundationFamilyDto(String id, String name, String foundationType, Boolean enabled, String source,
            ShallowGenerationDto shallowGeneration, PiledGenerationDto piledGeneration) {
    }

    public record BearingFamilyDto(String id, String name, String bearingType, Boolean enabled, String source,
            RangeRuleDto length, RangeRuleDto width, RangeRuleDto height) {
    }

    public record MaterialAssignmentDto(String id, Double no, String element, String concreteClass) {
    }
}
