package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.CrossSectionValues;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the cross section (one row per project): widths and spacing in metres. */
@Entity
@Table(name = "cross_section")
class CrossSectionEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "platform_width_m", nullable = false)
    private double platformWidthM;

    @Column(name = "left_walkway_m", nullable = false)
    private double leftWalkwayM;

    @Column(name = "right_walkway_m", nullable = false)
    private double rightWalkwayM;

    @Column(name = "space_of_girder_m", nullable = false)
    private double spaceOfGirderM;

    @Column(name = "number_of_girders", nullable = false)
    private double numberOfGirders;

    protected CrossSectionEntity() {
    }

    CrossSectionEntity(UUID projectId, CrossSectionValues v) {
        this.projectId = projectId;
        this.platformWidthM = v.platformWidthM();
        this.leftWalkwayM = v.leftWalkwayM();
        this.rightWalkwayM = v.rightWalkwayM();
        this.spaceOfGirderM = v.spaceOfGirderM();
        this.numberOfGirders = v.numberOfGirders();
    }

    CrossSectionValues toDomain() {
        return new CrossSectionValues(platformWidthM, leftWalkwayM, rightWalkwayM, spaceOfGirderM, numberOfGirders);
    }
}
