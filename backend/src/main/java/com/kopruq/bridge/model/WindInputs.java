package com.kopruq.bridge.model;

/** Wind inputs exactly as the user typed them (text); never interpreted here. */
public record WindInputs(String vb, String terrain, String ze) {

    public WindInputs {
        SectionInvariants.required("vb", vb);
        SectionInvariants.required("terrain", terrain);
        SectionInvariants.required("ze", ze);
    }
}
