package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.WindInputs;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the wind inputs (one row per project); the three values are the typed texts. */
@Entity
@Table(name = "load_wind_input")
class WindInputEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "basic_wind_velocity", nullable = false)
    private String basicWindVelocity;

    @Column(name = "terrain_category", nullable = false)
    private String terrainCategory;

    @Column(name = "reference_height", nullable = false)
    private String referenceHeight;

    protected WindInputEntity() {
    }

    WindInputEntity(UUID projectId, WindInputs v) {
        this.projectId = projectId;
        this.basicWindVelocity = v.vb();
        this.terrainCategory = v.terrain();
        this.referenceHeight = v.ze();
    }

    WindInputs toDomain() {
        return new WindInputs(basicWindVelocity, terrainCategory, referenceHeight);
    }
}
