package com.kopruq.bridge.model;

/** A material assignment as stored by the frontend; only {@code id} is required. {@code no} is a plain number. */
public record MaterialAssignment(String id, Double no, String element, String concreteClass) {

    public MaterialAssignment {
        SectionInvariants.notBlank("id", id);
        SectionInvariants.finiteOrNull("no", no);
    }
}
