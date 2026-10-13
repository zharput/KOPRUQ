package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.PierFamilyType;
import com.kopruq.bridge.model.PierFamily;
import com.kopruq.bridge.model.SweepDimension;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persistent form of one {@link PierFamily}. A null dimension / configuration list is told from an empty one by
 * {@code hasDimensions} / {@code hasAllowedConfigurations}; the optional {@code twoColumnSpacing} and
 * {@code heightApplicability} objects by their {@code ...Present} flags. Heights are metres. The lists are LAZY, so
 * {@link #toDomain()} must run inside the repository's transaction.
 */
@Entity
@Table(name = "family_pier")
class PierFamilyEntity {

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
    @Column(name = "pier_type", length = 16)
    private PierFamilyType pierType;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "source")
    private String source;

    @Column(name = "has_dimensions", nullable = false)
    private boolean hasDimensions;

    @Column(name = "has_allowed_configurations", nullable = false)
    private boolean hasAllowedConfigurations;

    @Column(name = "two_column_spacing_present", nullable = false)
    private boolean twoColumnSpacingPresent;
    @Column(name = "two_column_spacing_key")
    private String twoColumnSpacingKey;
    @Column(name = "two_column_spacing_label")
    private String twoColumnSpacingLabel;
    @Column(name = "two_column_spacing_min")
    private Double twoColumnSpacingMin;
    @Column(name = "two_column_spacing_max")
    private Double twoColumnSpacingMax;
    @Column(name = "two_column_spacing_delta")
    private Double twoColumnSpacingDelta;

    @Column(name = "height_applicability_present", nullable = false)
    private boolean heightApplicabilityPresent;
    @Column(name = "height_minimum_m")
    private Double heightMinimumM;
    @Column(name = "height_preferred_min_m")
    private Double heightPreferredMinM;
    @Column(name = "height_preferred_max_m")
    private Double heightPreferredMaxM;
    @Column(name = "height_maximum_m")
    private Double heightMaximumM;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "family_pier_dimension", joinColumns = @JoinColumn(name = "pier_family_id"))
    @OrderColumn(name = "dimension_index")
    private List<SweepDimensionEmbeddable> dimensions = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "family_pier_configuration", joinColumns = @JoinColumn(name = "pier_family_id"))
    @OrderColumn(name = "configuration_index")
    @Column(name = "configuration", nullable = false)
    private List<String> allowedConfigurations = new ArrayList<>();

    protected PierFamilyEntity() {
    }

    PierFamilyEntity(UUID projectId, int ordinal, PierFamily f) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.familyId = f.id();
        this.name = f.name();
        this.pierType = f.pierType();
        this.enabled = f.enabled();
        this.source = f.source();
        this.hasDimensions = f.dimensions() != null;
        if (f.dimensions() != null) {
            for (SweepDimension d : f.dimensions()) {
                dimensions.add(SweepDimensionEmbeddable.from(d));
            }
        }
        this.hasAllowedConfigurations = f.allowedConfigurations() != null;
        if (f.allowedConfigurations() != null) {
            allowedConfigurations.addAll(f.allowedConfigurations());
        }
        SweepDimension s = f.twoColumnSpacing();
        this.twoColumnSpacingPresent = s != null;
        if (s != null) {
            this.twoColumnSpacingKey = s.key();
            this.twoColumnSpacingLabel = s.label();
            this.twoColumnSpacingMin = s.min();
            this.twoColumnSpacingMax = s.max();
            this.twoColumnSpacingDelta = s.delta();
        }
        PierFamily.HeightApplicability h = f.heightApplicability();
        this.heightApplicabilityPresent = h != null;
        if (h != null) {
            this.heightMinimumM = h.minimumHeight();
            this.heightPreferredMinM = h.preferredHeightMin();
            this.heightPreferredMaxM = h.preferredHeightMax();
            this.heightMaximumM = h.maximumHeight();
        }
    }

    PierFamily toDomain() {
        List<SweepDimension> dims = hasDimensions
                ? dimensions.stream().map(SweepDimensionEmbeddable::toDomain).toList() : null;
        List<String> configs = hasAllowedConfigurations ? List.copyOf(allowedConfigurations) : null;
        SweepDimension spacing = twoColumnSpacingPresent
                ? new SweepDimension(twoColumnSpacingKey, twoColumnSpacingLabel, twoColumnSpacingMin,
                        twoColumnSpacingMax, twoColumnSpacingDelta)
                : null;
        PierFamily.HeightApplicability height = heightApplicabilityPresent
                ? new PierFamily.HeightApplicability(heightMinimumM, heightPreferredMinM, heightPreferredMaxM,
                        heightMaximumM)
                : null;
        return new PierFamily(familyId, name, pierType, enabled, dims, configs, spacing, height, source);
    }
}
