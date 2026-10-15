package com.kopruq.bridge.model;

/**
 * Wind inputs as text; never interpreted here. The frontend stores them canonical: {@code vb} in m/s and {@code ze}
 * in metres, whatever display units the project prefers (the unit preferences are display-only).
 */
public record WindInputs(String vb, String terrain, String ze) {

    public WindInputs {
        SectionInvariants.required("vb", vb);
        SectionInvariants.required("terrain", terrain);
        SectionInvariants.required("ze", ze);
    }
}
