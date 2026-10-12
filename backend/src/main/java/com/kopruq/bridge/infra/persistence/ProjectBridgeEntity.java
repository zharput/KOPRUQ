package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.Bridge;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/** The {@link Bridge} of a project (0..1; no row means the project has no bridge). Lengths in metres. */
@Entity
@Table(name = "project_bridge")
class ProjectBridgeEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @Column(name = "bridge_name")
    private String bridgeName;
    @Column(name = "total_length_m", nullable = false)
    private double totalLengthM;
    @Column(name = "deck_width_m", nullable = false)
    private double deckWidthM;

    protected ProjectBridgeEntity() {
    }

    ProjectBridgeEntity(ProjectEntity project) {
        this.project = project;
    }

    void apply(Bridge b) {
        this.bridgeName = b.bridgeName();
        this.totalLengthM = b.totalLengthM();
        this.deckWidthM = b.deckWidthM();
    }

    Bridge toDomain() {
        return new Bridge(bridgeName, totalLengthM, deckWidthM);
    }
}
