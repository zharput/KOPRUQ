package com.kopruq.bridge.api;

import java.util.List;

/** Bodies of the design-system {@code PUT} endpoints: the revision the client last saw, and the new section value. */
public final class DesignSystemPutRequests {

    private DesignSystemPutRequests() {
    }

    /** Common shape of a section write request. */
    public interface SectionPut<V> {
        Long expectedRevision();

        V value();
    }

    public record BridgeDefinitionsPut(Long expectedRevision, BridgeDefinitionsDto value)
            implements SectionPut<BridgeDefinitionsDto> {
    }

    public record PierFamiliesPut(Long expectedRevision, List<FamilyDtos.PierFamilyDto> value)
            implements SectionPut<List<FamilyDtos.PierFamilyDto>> {
    }

    public record PierCapFamiliesPut(Long expectedRevision, List<FamilyDtos.PierCapFamilyDto> value)
            implements SectionPut<List<FamilyDtos.PierCapFamilyDto>> {
    }

    public record FoundationFamiliesPut(Long expectedRevision, List<FamilyDtos.FoundationFamilyDto> value)
            implements SectionPut<List<FamilyDtos.FoundationFamilyDto>> {
    }

    public record BearingFamiliesPut(Long expectedRevision, List<FamilyDtos.BearingFamilyDto> value)
            implements SectionPut<List<FamilyDtos.BearingFamilyDto>> {
    }

    public record MaterialAssignmentsPut(Long expectedRevision, List<FamilyDtos.MaterialAssignmentDto> value)
            implements SectionPut<List<FamilyDtos.MaterialAssignmentDto>> {
    }

    public record GirderLibraryPut(Long expectedRevision, GirderLibraryDto value)
            implements SectionPut<GirderLibraryDto> {
    }

    public record PreferredSpanRulesPut(Long expectedRevision, List<PreferredSpanRuleDto> value)
            implements SectionPut<List<PreferredSpanRuleDto>> {
    }

    public record CrossSectionPut(Long expectedRevision, CrossSectionDto value)
            implements SectionPut<CrossSectionDto> {
    }
}
