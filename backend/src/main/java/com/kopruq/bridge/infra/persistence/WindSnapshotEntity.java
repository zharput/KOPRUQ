package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.WindSnapshot;
import com.kopruq.bridge.model.WindSnapshotInputs;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the wind snapshot (one row per project): the inputs only, never the calculated result. */
@Entity
@Table(name = "load_wind_snapshot")
class WindSnapshotEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(name = "snapshot_status")
    private String snapshotStatus;

    @Column(name = "basic_wind_velocity", nullable = false)
    private String basicWindVelocity;

    @Column(name = "terrain_category", nullable = false)
    private String terrainCategory;

    @Column(name = "reference_height", nullable = false)
    private String referenceHeight;

    @Column(name = "deck_width_m", nullable = false)
    private double deckWidthM;

    @Column(name = "dref_m", nullable = false)
    private double drefM;

    protected WindSnapshotEntity() {
    }

    WindSnapshotEntity(UUID projectId, WindSnapshot s) {
        this.projectId = projectId;
        this.schemaVersion = s.schemaVersion();
        this.snapshotStatus = s.status();
        this.basicWindVelocity = s.inputs().vb();
        this.terrainCategory = s.inputs().terrain();
        this.referenceHeight = s.inputs().ze();
        this.deckWidthM = s.inputs().deckWidthM();
        this.drefM = s.inputs().drefM();
    }

    WindSnapshot toDomain() {
        return new WindSnapshot(schemaVersion, snapshotStatus, new WindSnapshotInputs(basicWindVelocity,
                terrainCategory, referenceHeight, deckWidthM, drefM));
    }
}
