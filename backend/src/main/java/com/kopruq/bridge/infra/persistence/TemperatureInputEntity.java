package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.TemperatureInputs;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the temperature inputs (one row per project); the three values are the typed texts. */
@Entity
@Table(name = "load_temperature_input")
class TemperatureInputEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "effective_minimum", nullable = false)
    private String effectiveMinimum;

    @Column(name = "effective_maximum", nullable = false)
    private String effectiveMaximum;

    @Column(name = "initial_temperature", nullable = false)
    private String initialTemperature;

    protected TemperatureInputEntity() {
    }

    TemperatureInputEntity(UUID projectId, TemperatureInputs v) {
        this.projectId = projectId;
        this.effectiveMinimum = v.min();
        this.effectiveMaximum = v.max();
        this.initialTemperature = v.t0();
    }

    TemperatureInputs toDomain() {
        return new TemperatureInputs(effectiveMinimum, effectiveMaximum, initialTemperature);
    }
}
