package com.kopruq.bridge.model;

/**
 * A wind calculation snapshot: the inputs and, optionally, the result calculated from them. The result is stored as
 * calculated (null = no result); whether it is still valid is decided at read time by comparing the inputs (M3b).
 */
public record WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs, WindSnapshotResult result) {

    public static final int SCHEMA_VERSION = 1;

    public WindSnapshot {
        if (schemaVersion != SCHEMA_VERSION) {
            throw new IllegalArgumentException("schemaVersion must be " + SCHEMA_VERSION);
        }
        SectionInvariants.required("inputs", inputs);
    }
}
