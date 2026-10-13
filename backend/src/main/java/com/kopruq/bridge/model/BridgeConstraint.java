package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.ConstraintKind;

/** A site constraint of a bridge definition; chainages in metres. */
public record BridgeConstraint(String id, ConstraintKind kind, String name, Double startChainageM,
        Double endChainageM, String note) {

    public BridgeConstraint {
        SectionInvariants.required("id", id);
        SectionInvariants.required("kind", kind);
        SectionInvariants.required("name", name);
        SectionInvariants.finiteOrNull("startChainageM", startChainageM);
        SectionInvariants.finiteOrNull("endChainageM", endChainageM);
        SectionInvariants.required("note", note);
    }
}
