package com.kopruq.bridge.model;

/** Seismic inputs exactly as the user typed them (the frontend keeps all four as text); never interpreted here. */
public record SeismicInputs(String a, String g, String t, String i) {

    public SeismicInputs {
        SectionInvariants.required("a", a);
        SectionInvariants.required("g", g);
        SectionInvariants.required("t", t);
        SectionInvariants.required("i", i);
    }
}
