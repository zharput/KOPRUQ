package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.SeismicInputs;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the seismic inputs (one row per project); the four values are the typed texts. */
@Entity
@Table(name = "load_seismic_input")
class SeismicInputEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "reference_pga", nullable = false)
    private String referencePga;

    @Column(name = "ground_type", nullable = false)
    private String groundType;

    @Column(name = "spectrum_type", nullable = false)
    private String spectrumType;

    @Column(name = "importance_factor", nullable = false)
    private String importanceFactor;

    protected SeismicInputEntity() {
    }

    SeismicInputEntity(UUID projectId, SeismicInputs v) {
        this.projectId = projectId;
        this.referencePga = v.a();
        this.groundType = v.g();
        this.spectrumType = v.t();
        this.importanceFactor = v.i();
    }

    SeismicInputs toDomain() {
        return new SeismicInputs(referencePga, groundType, spectrumType, importanceFactor);
    }
}
