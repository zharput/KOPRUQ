package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.BearingFamilyType;
import com.kopruq.bridge.model.BearingFamily;
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

/** Persistent form of one {@link BearingFamily}; rule values are millimetres. See {@link RangeRuleEmbeddable}. */
@Entity
@Table(name = "family_bearing")
class BearingFamilyEntity {

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
    @Column(name = "bearing_type", length = 16)
    private BearingFamilyType bearingType;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "source")
    private String source;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "length_min_mm")),
            @AttributeOverride(name = "max", column = @Column(name = "length_max_mm")),
            @AttributeOverride(name = "delta", column = @Column(name = "length_delta_mm"))})
    private RangeRuleEmbeddable length;

    @Column(name = "length_present", nullable = false)
    private boolean lengthPresent;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "width_min_mm")),
            @AttributeOverride(name = "max", column = @Column(name = "width_max_mm")),
            @AttributeOverride(name = "delta", column = @Column(name = "width_delta_mm"))})
    private RangeRuleEmbeddable width;

    @Column(name = "width_present", nullable = false)
    private boolean widthPresent;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "height_min_mm")),
            @AttributeOverride(name = "max", column = @Column(name = "height_max_mm")),
            @AttributeOverride(name = "delta", column = @Column(name = "height_delta_mm"))})
    private RangeRuleEmbeddable height;

    @Column(name = "height_present", nullable = false)
    private boolean heightPresent;

    protected BearingFamilyEntity() {
    }

    BearingFamilyEntity(UUID projectId, int ordinal, BearingFamily f) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.familyId = f.id();
        this.name = f.name();
        this.bearingType = f.bearingType();
        this.enabled = f.enabled();
        this.source = f.source();
        this.length = RangeRuleEmbeddable.from(f.length());
        this.lengthPresent = f.length() != null;
        this.width = RangeRuleEmbeddable.from(f.width());
        this.widthPresent = f.width() != null;
        this.height = RangeRuleEmbeddable.from(f.height());
        this.heightPresent = f.height() != null;
    }

    BearingFamily toDomain() {
        return new BearingFamily(familyId, name, bearingType, enabled,
                RangeRuleEmbeddable.toDomain(length, lengthPresent),
                RangeRuleEmbeddable.toDomain(width, widthPresent),
                RangeRuleEmbeddable.toDomain(height, heightPresent), source);
    }
}
