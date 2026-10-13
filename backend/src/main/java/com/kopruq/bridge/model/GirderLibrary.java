package com.kopruq.bridge.model;

import java.util.List;

/** The girder library settings; {@code enabled} and {@code dimensions} may each be absent (null differs from []). */
public record GirderLibrary(Boolean enabled, List<SweepDimension> dimensions) {

    public GirderLibrary {
        dimensions = SectionInvariants.copyNonNullOrNull("dimensions", dimensions);
    }
}
