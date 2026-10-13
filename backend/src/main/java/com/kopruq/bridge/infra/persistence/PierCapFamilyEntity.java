package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.PierCapConfiguration;
import com.kopruq.bridge.enums.PierCapType;
import com.kopruq.bridge.model.PierCapFamily;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of one {@link PierCapFamily}; rule values are metres. See {@link RangeRuleEmbeddable}. */
@Entity
@Table(name = "family_pier_cap")
class PierCapFamilyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "family_id", nullable = false)
    private String familyId;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "cap_type", length = 16)
    private PierCapType capType;

    @Enumerated(EnumType.STRING)
    @Column(name = "compatible_pier_configuration", length = 16)
    private PierCapConfiguration compatiblePierConfiguration;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "source")
    private String source;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "cap_transverse_length_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "cap_transverse_length_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "cap_transverse_length_delta_m"))})
    private RangeRuleEmbeddable capTransverseLength;

    @Column(name = "cap_transverse_length_present", nullable = false)
    private boolean capTransverseLengthPresent;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "cap_structural_height_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "cap_structural_height_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "cap_structural_height_delta_m"))})
    private RangeRuleEmbeddable capStructuralHeight;

    @Column(name = "cap_structural_height_present", nullable = false)
    private boolean capStructuralHeightPresent;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "stem_width_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "stem_width_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "stem_width_delta_m"))})
    private RangeRuleEmbeddable stemWidth;

    @Column(name = "stem_width_present", nullable = false)
    private boolean stemWidthPresent;

    protected PierCapFamilyEntity() {
    }

    PierCapFamilyEntity(UUID projectId, int ordinal, PierCapFamily f) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.familyId = f.id();
        this.name = f.name();
        this.capType = f.capType();
        this.compatiblePierConfiguration = f.compatiblePierConfiguration();
        this.enabled = f.enabled();
        this.source = f.source();
        this.capTransverseLength = RangeRuleEmbeddable.from(f.capTransverseLength());
        this.capTransverseLengthPresent = f.capTransverseLength() != null;
        this.capStructuralHeight = RangeRuleEmbeddable.from(f.capStructuralHeight());
        this.capStructuralHeightPresent = f.capStructuralHeight() != null;
        this.stemWidth = RangeRuleEmbeddable.from(f.stemWidth());
        this.stemWidthPresent = f.stemWidth() != null;
    }

    PierCapFamily toDomain() {
        return new PierCapFamily(familyId, name, capType, compatiblePierConfiguration,
                RangeRuleEmbeddable.toDomain(capTransverseLength, capTransverseLengthPresent),
                RangeRuleEmbeddable.toDomain(capStructuralHeight, capStructuralHeightPresent),
                RangeRuleEmbeddable.toDomain(stemWidth, stemWidthPresent), enabled, source);
    }
}
