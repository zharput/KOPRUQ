package com.kopruq.bridge.api;

/** JSON shape of the cross section; every field is required. Widths and spacing are metres. */
public record CrossSectionDto(Double platformWidthM, Double leftWalkwayM, Double rightWalkwayM,
        Double spaceOfGirderM, Double numberOfGirders) {
}
