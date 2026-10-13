package com.kopruq.bridge.api;

import java.util.List;

/** The {@code families} object of the project document: each catalog is null until it has been written. */
public record FamiliesDto(List<FamilyDtos.PierFamilyDto> piers, List<FamilyDtos.PierCapFamilyDto> pierCaps,
        List<FamilyDtos.FoundationFamilyDto> foundations, List<FamilyDtos.BearingFamilyDto> bearings,
        List<FamilyDtos.MaterialAssignmentDto> materials) {
}
