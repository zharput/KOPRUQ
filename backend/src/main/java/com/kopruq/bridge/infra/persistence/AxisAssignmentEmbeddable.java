package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.AxisFamilyAssignment;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One per-axis family assignment row of a bridge definition (metres where named). */
@Embeddable
class AxisAssignmentEmbeddable {

    @Column(name = "axis_id", nullable = false)
    private String axisId;
    @Column(name = "pier_family_id")
    private String pierFamilyId;
    @Column(name = "pier_height_m")
    private Double pierHeightM;
    @Column(name = "pier_cap_family_id")
    private String pierCapFamilyId;
    @Column(name = "foundation_family_id")
    private String foundationFamilyId;
    @Column(name = "foundation_elevation_m")
    private Double foundationElevationM;
    @Column(name = "soil_reference", nullable = false)
    private String soilReference;
    @Column(name = "bearing_family_id")
    private String bearingFamilyId;
    @Column(name = "bearing_quantity")
    private Double bearingQuantity;
    @Column(name = "bearing_orientation", nullable = false)
    private String bearingOrientation;
    @Column(name = "longitudinal_behavior", nullable = false)
    private String longitudinalBehavior;
    @Column(name = "transverse_behavior", nullable = false)
    private String transverseBehavior;

    protected AxisAssignmentEmbeddable() {
    }

    static AxisAssignmentEmbeddable from(AxisFamilyAssignment a) {
        AxisAssignmentEmbeddable e = new AxisAssignmentEmbeddable();
        e.axisId = a.axisId();
        e.pierFamilyId = a.pierFamilyId();
        e.pierHeightM = a.pierHeightM();
        e.pierCapFamilyId = a.pierCapFamilyId();
        e.foundationFamilyId = a.foundationFamilyId();
        e.foundationElevationM = a.foundationElevationM();
        e.soilReference = a.soilReference();
        e.bearingFamilyId = a.bearingFamilyId();
        e.bearingQuantity = a.bearingQuantity();
        e.bearingOrientation = a.bearingOrientation();
        e.longitudinalBehavior = a.longitudinalBehavior();
        e.transverseBehavior = a.transverseBehavior();
        return e;
    }

    AxisFamilyAssignment toDomain() {
        return new AxisFamilyAssignment(axisId, pierFamilyId, pierHeightM, pierCapFamilyId, foundationFamilyId,
                foundationElevationM, soilReference, bearingFamilyId, bearingQuantity, bearingOrientation,
                longitudinalBehavior, transverseBehavior);
    }
}
