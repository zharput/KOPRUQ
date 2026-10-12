package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.DesignSpace;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * The {@link DesignSpace} of a project (0..1; no row means the project has none). All 15 values are stored together
 * and required together; there are no database defaults (not even for the girder depth step). Lengths in metres.
 */
@Entity
@Table(name = "project_design_space")
class ProjectDesignSpaceEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @Column(name = "min_span_m", nullable = false)
    private double minSpanM;
    @Column(name = "max_span_m", nullable = false)
    private double maxSpanM;
    @Column(name = "min_girder_count", nullable = false)
    private int minGirderCount;
    @Column(name = "max_girder_count", nullable = false)
    private int maxGirderCount;
    @Column(name = "min_girder_spacing_m", nullable = false)
    private double minGirderSpacingM;
    @Column(name = "max_girder_spacing_m", nullable = false)
    private double maxGirderSpacingM;
    @Column(name = "min_girder_depth_m", nullable = false)
    private double minGirderDepthM;
    @Column(name = "max_girder_depth_m", nullable = false)
    private double maxGirderDepthM;
    @Column(name = "min_slab_thickness_m", nullable = false)
    private double minSlabThicknessM;
    @Column(name = "max_slab_thickness_m", nullable = false)
    private double maxSlabThicknessM;
    @Column(name = "min_pier_diameter_m", nullable = false)
    private double minPierDiameterM;
    @Column(name = "max_pier_diameter_m", nullable = false)
    private double maxPierDiameterM;
    @Column(name = "min_pier_height_m", nullable = false)
    private double minPierHeightM;
    @Column(name = "max_pier_height_m", nullable = false)
    private double maxPierHeightM;
    @Column(name = "girder_depth_step_m", nullable = false)
    private double girderDepthStepM;

    protected ProjectDesignSpaceEntity() {
    }

    ProjectDesignSpaceEntity(ProjectEntity project) {
        this.project = project;
    }

    void apply(DesignSpace d) {
        this.minSpanM = d.minSpanM();
        this.maxSpanM = d.maxSpanM();
        this.minGirderCount = d.minGirderCount();
        this.maxGirderCount = d.maxGirderCount();
        this.minGirderSpacingM = d.minGirderSpacingM();
        this.maxGirderSpacingM = d.maxGirderSpacingM();
        this.minGirderDepthM = d.minGirderDepthM();
        this.maxGirderDepthM = d.maxGirderDepthM();
        this.minSlabThicknessM = d.minSlabThicknessM();
        this.maxSlabThicknessM = d.maxSlabThicknessM();
        this.minPierDiameterM = d.minPierDiameterM();
        this.maxPierDiameterM = d.maxPierDiameterM();
        this.minPierHeightM = d.minPierHeightM();
        this.maxPierHeightM = d.maxPierHeightM();
        this.girderDepthStepM = d.girderDepthStepM();
    }

    DesignSpace toDomain() {
        return new DesignSpace(minSpanM, maxSpanM, minGirderCount, maxGirderCount, minGirderSpacingM,
                maxGirderSpacingM, minGirderDepthM, maxGirderDepthM, minSlabThicknessM, maxSlabThicknessM,
                minPierDiameterM, maxPierDiameterM, minPierHeightM, maxPierHeightM, girderDepthStepM);
    }
}
