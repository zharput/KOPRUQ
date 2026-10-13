package com.kopruq.bridge.api;

import java.util.List;

/** JSON shape of the girder library; {@code enabled} and {@code dimensions} may each be null. */
public record GirderLibraryDto(Boolean enabled, List<FamilyDtos.SweepDimensionDto> dimensions) {
}
