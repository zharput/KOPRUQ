package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.BearingFamilyType;

/** A bearing family as stored by the frontend; only {@code id} is required. Rule values are in millimetres. */
public record BearingFamily(String id, String name, BearingFamilyType bearingType, Boolean enabled, RangeRule length,
        RangeRule width, RangeRule height, String source) {

    public BearingFamily {
        SectionInvariants.notBlank("id", id);
    }
}
