package com.kopruq.bridge.model;

/** The inputs of a wind calculation snapshot: three typed texts, deck width and reference depth in metres. */
public record WindSnapshotInputs(String vb, String terrain, String ze, double deckWidthM, double drefM) {

    public WindSnapshotInputs {
        SectionInvariants.required("vb", vb);
        SectionInvariants.required("terrain", terrain);
        SectionInvariants.required("ze", ze);
        SectionInvariants.finite("deckWidthM", deckWidthM);
        SectionInvariants.finite("drefM", drefM);
    }
}
