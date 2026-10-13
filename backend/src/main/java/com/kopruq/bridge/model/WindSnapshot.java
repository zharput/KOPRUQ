package com.kopruq.bridge.model;

/** A wind calculation snapshot. Only the inputs are stored; the calculated result is never persisted. */
public record WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs) {

    public static final int SCHEMA_VERSION = 1;

    public WindSnapshot {
        if (schemaVersion != SCHEMA_VERSION) {
            throw new IllegalArgumentException("schemaVersion must be " + SCHEMA_VERSION);
        }
        SectionInvariants.required("inputs", inputs);
    }
}
