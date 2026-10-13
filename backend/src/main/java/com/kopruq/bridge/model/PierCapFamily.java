package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.PierCapConfiguration;
import com.kopruq.bridge.enums.PierCapType;

/** A pier cap family as stored by the frontend; only {@code id} is required. Rule values are in metres. */
public record PierCapFamily(String id, String name, PierCapType capType,
        PierCapConfiguration compatiblePierConfiguration, RangeRule capTransverseLength,
        RangeRule capStructuralHeight, RangeRule stemWidth, Boolean enabled, String source) {

    public PierCapFamily {
        SectionInvariants.notBlank("id", id);
    }
}
