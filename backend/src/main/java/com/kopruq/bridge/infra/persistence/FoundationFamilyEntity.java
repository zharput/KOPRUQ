package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.FoundationFamilyType;
import com.kopruq.bridge.model.FoundationFamily;
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

/**
 * Persistent form of one {@link FoundationFamily}. Rule values are metres, except the pile counts (unitless). The
 * {@code shallowPresent} / {@code piledPresent} flags tell a generation that is absent from one that is present.
 */
@Entity
@Table(name = "family_foundation")
class FoundationFamilyEntity {

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
    @Column(name = "foundation_type", length = 16)
    private FoundationFamilyType foundationType;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "source")
    private String source;

    @Column(name = "shallow_present", nullable = false)
    private boolean shallowPresent;

    @Column(name = "piled_present", nullable = false)
    private boolean piledPresent;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "shallow_length_x_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "shallow_length_x_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "shallow_length_x_delta_m"))})
    private RangeRuleEmbeddable shallowLengthX;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "shallow_length_y_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "shallow_length_y_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "shallow_length_y_delta_m"))})
    private RangeRuleEmbeddable shallowLengthY;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "shallow_height_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "shallow_height_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "shallow_height_delta_m"))})
    private RangeRuleEmbeddable shallowHeight;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_pile_diameter_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_pile_diameter_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_pile_diameter_delta_m"))})
    private RangeRuleEmbeddable piledPileDiameter;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_pile_count_x_min")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_pile_count_x_max")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_pile_count_x_delta"))})
    private RangeRuleEmbeddable piledPileCountX;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_pile_spacing_x_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_pile_spacing_x_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_pile_spacing_x_delta_m"))})
    private RangeRuleEmbeddable piledPileSpacingX;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_pile_count_y_min")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_pile_count_y_max")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_pile_count_y_delta"))})
    private RangeRuleEmbeddable piledPileCountY;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_pile_spacing_y_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_pile_spacing_y_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_pile_spacing_y_delta_m"))})
    private RangeRuleEmbeddable piledPileSpacingY;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "min", column = @Column(name = "piled_height_min_m")),
            @AttributeOverride(name = "max", column = @Column(name = "piled_height_max_m")),
            @AttributeOverride(name = "delta", column = @Column(name = "piled_height_delta_m"))})
    private RangeRuleEmbeddable piledHeight;

    protected FoundationFamilyEntity() {
    }

    FoundationFamilyEntity(UUID projectId, int ordinal, FoundationFamily f) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.familyId = f.id();
        this.name = f.name();
        this.foundationType = f.foundationType();
        this.enabled = f.enabled();
        this.source = f.source();
        FoundationFamily.ShallowGeneration s = f.shallowGeneration();
        this.shallowPresent = s != null;
        this.shallowLengthX = s == null ? null : RangeRuleEmbeddable.from(s.lengthX());
        this.shallowLengthY = s == null ? null : RangeRuleEmbeddable.from(s.lengthY());
        this.shallowHeight = s == null ? null : RangeRuleEmbeddable.from(s.height());
        FoundationFamily.PiledGeneration p = f.piledGeneration();
        this.piledPresent = p != null;
        this.piledPileDiameter = p == null ? null : RangeRuleEmbeddable.from(p.pileDiameter());
        this.piledPileCountX = p == null ? null : RangeRuleEmbeddable.from(p.pileCountX());
        this.piledPileSpacingX = p == null ? null : RangeRuleEmbeddable.from(p.pileSpacingX());
        this.piledPileCountY = p == null ? null : RangeRuleEmbeddable.from(p.pileCountY());
        this.piledPileSpacingY = p == null ? null : RangeRuleEmbeddable.from(p.pileSpacingY());
        this.piledHeight = p == null ? null : RangeRuleEmbeddable.from(p.height());
    }

    FoundationFamily toDomain() {
        FoundationFamily.ShallowGeneration s = !shallowPresent ? null
                : new FoundationFamily.ShallowGeneration(RangeRuleEmbeddable.toDomain(shallowLengthX, true),
                        RangeRuleEmbeddable.toDomain(shallowLengthY, true),
                        RangeRuleEmbeddable.toDomain(shallowHeight, true));
        FoundationFamily.PiledGeneration p = !piledPresent ? null
                : new FoundationFamily.PiledGeneration(RangeRuleEmbeddable.toDomain(piledPileDiameter, true),
                        RangeRuleEmbeddable.toDomain(piledPileCountX, true),
                        RangeRuleEmbeddable.toDomain(piledPileSpacingX, true),
                        RangeRuleEmbeddable.toDomain(piledPileCountY, true),
                        RangeRuleEmbeddable.toDomain(piledPileSpacingY, true),
                        RangeRuleEmbeddable.toDomain(piledHeight, true));
        return new FoundationFamily(familyId, name, foundationType, enabled, s, p, source);
    }
}
