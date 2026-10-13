package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.ParameterProvenance;
import com.kopruq.bridge.model.Lm1LaneFactor;
import com.kopruq.bridge.model.Lm1ParameterValue;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Persistent form of one traffic-LM1 lane factor. Units depend on the group (characteristic value in kN for the
 * tandem system, kN/m2 for the UDL groups; the adjustment factor is unitless), so they are not in the column names.
 */
@Entity
@Table(name = "load_traffic_lm1_factor")
class TrafficLm1FactorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "factor_group", nullable = false, length = 24)
    private Lm1FactorGroup factorGroup;

    @Column(name = "factor_index", nullable = false)
    private int factorIndex;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "characteristic_value")
    private Double characteristicValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "characteristic_provenance", nullable = false, length = 32)
    private ParameterProvenance characteristicProvenance;

    @Column(name = "characteristic_code_default")
    private Double characteristicCodeDefault;

    @Column(name = "adjustment_value")
    private Double adjustmentValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_provenance", nullable = false, length = 32)
    private ParameterProvenance adjustmentProvenance;

    @Column(name = "adjustment_code_default")
    private Double adjustmentCodeDefault;

    protected TrafficLm1FactorEntity() {
    }

    TrafficLm1FactorEntity(UUID projectId, Lm1FactorGroup group, int index, Lm1LaneFactor f) {
        this.projectId = projectId;
        this.factorGroup = group;
        this.factorIndex = index;
        this.label = f.label();
        this.characteristicValue = f.characteristicValue().value();
        this.characteristicProvenance = f.characteristicValue().provenance();
        this.characteristicCodeDefault = f.characteristicValue().codeDefaultValue();
        this.adjustmentValue = f.adjustmentFactor().value();
        this.adjustmentProvenance = f.adjustmentFactor().provenance();
        this.adjustmentCodeDefault = f.adjustmentFactor().codeDefaultValue();
    }

    Lm1FactorGroup getFactorGroup() {
        return factorGroup;
    }

    Lm1LaneFactor toDomain() {
        return new Lm1LaneFactor(label,
                new Lm1ParameterValue(characteristicValue, characteristicProvenance, characteristicCodeDefault),
                new Lm1ParameterValue(adjustmentValue, adjustmentProvenance, adjustmentCodeDefault));
    }
}
