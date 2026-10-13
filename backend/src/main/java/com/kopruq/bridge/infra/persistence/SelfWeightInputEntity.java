package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.SelfWeightInputs;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of the self-weight inputs (one row per project): metres, kN/m3 and kN/m as the names state; counts unitless. */
@Entity
@Table(name = "load_self_weight_input")
class SelfWeightInputEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "asphalt_thickness_m", nullable = false)
    private double asphaltThicknessM;
    @Column(name = "asphalt_unit_weight_kn_m3", nullable = false)
    private double asphaltUnitWeightKNm3;
    @Column(name = "sidewalk_thickness_m", nullable = false)
    private double sidewalkThicknessM;
    @Column(name = "sidewalk_unit_weight_kn_m3", nullable = false)
    private double sidewalkUnitWeightKNm3;
    @Column(name = "facia_count", nullable = false)
    private double faciaCount;
    @Column(name = "facia_width_m", nullable = false)
    private double faciaWidthM;
    @Column(name = "facia_thickness_m", nullable = false)
    private double faciaThicknessM;
    @Column(name = "facia_unit_weight_kn_m3", nullable = false)
    private double faciaUnitWeightKNm3;
    @Column(name = "guardrail_count", nullable = false)
    private double guardrailCount;
    @Column(name = "guardrail_unit_load_kn_m", nullable = false)
    private double guardrailUnitLoadKNm;
    @Column(name = "pedestrian_railing_count", nullable = false)
    private double pedestrianRailingCount;
    @Column(name = "pedestrian_railing_unit_load_kn_m", nullable = false)
    private double pedestrianRailingUnitLoadKNm;
    @Column(name = "protective_fence_count", nullable = false)
    private double protectiveFenceCount;
    @Column(name = "protective_fence_unit_load_kn_m", nullable = false)
    private double protectiveFenceUnitLoadKNm;
    @Column(name = "sound_panel_count", nullable = false)
    private double soundPanelCount;
    @Column(name = "sound_panel_unit_load_kn_m", nullable = false)
    private double soundPanelUnitLoadKNm;

    protected SelfWeightInputEntity() {
    }

    SelfWeightInputEntity(UUID projectId, SelfWeightInputs v) {
        this.projectId = projectId;
        this.asphaltThicknessM = v.asphaltThicknessM();
        this.asphaltUnitWeightKNm3 = v.asphaltUnitWeightKNm3();
        this.sidewalkThicknessM = v.sidewalkThicknessM();
        this.sidewalkUnitWeightKNm3 = v.sidewalkUnitWeightKNm3();
        this.faciaCount = v.faciaCount();
        this.faciaWidthM = v.faciaWidthM();
        this.faciaThicknessM = v.faciaThicknessM();
        this.faciaUnitWeightKNm3 = v.faciaUnitWeightKNm3();
        this.guardrailCount = v.guardrailCount();
        this.guardrailUnitLoadKNm = v.guardrailUnitLoadKNm();
        this.pedestrianRailingCount = v.pedestrianRailingCount();
        this.pedestrianRailingUnitLoadKNm = v.pedestrianRailingUnitLoadKNm();
        this.protectiveFenceCount = v.protectiveFenceCount();
        this.protectiveFenceUnitLoadKNm = v.protectiveFenceUnitLoadKNm();
        this.soundPanelCount = v.soundPanelCount();
        this.soundPanelUnitLoadKNm = v.soundPanelUnitLoadKNm();
    }

    SelfWeightInputs toDomain() {
        return new SelfWeightInputs(asphaltThicknessM, asphaltUnitWeightKNm3, sidewalkThicknessM,
                sidewalkUnitWeightKNm3, faciaCount, faciaWidthM, faciaThicknessM, faciaUnitWeightKNm3,
                guardrailCount, guardrailUnitLoadKNm, pedestrianRailingCount, pedestrianRailingUnitLoadKNm,
                protectiveFenceCount, protectiveFenceUnitLoadKNm, soundPanelCount, soundPanelUnitLoadKNm);
    }
}
