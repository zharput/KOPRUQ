package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.SweepDimension;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persistent form of the girder library (one row per project, keyed by the project id). A null dimension list is
 * told from an empty one by {@code hasDimensions}. The list is LAZY, so {@link #toDomain()} must run inside the
 * repository's transaction.
 */
@Entity
@Table(name = "girder_library")
class GirderLibraryEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "has_dimensions", nullable = false)
    private boolean hasDimensions;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "girder_library_dimension", joinColumns = @JoinColumn(name = "project_id"))
    @OrderColumn(name = "dimension_index")
    private List<SweepDimensionEmbeddable> dimensions = new ArrayList<>();

    protected GirderLibraryEntity() {
    }

    GirderLibraryEntity(UUID projectId, GirderLibrary library) {
        this.projectId = projectId;
        this.enabled = library.enabled();
        this.hasDimensions = library.dimensions() != null;
        if (library.dimensions() != null) {
            for (SweepDimension d : library.dimensions()) {
                dimensions.add(SweepDimensionEmbeddable.from(d));
            }
        }
    }

    GirderLibrary toDomain() {
        return new GirderLibrary(enabled,
                hasDimensions ? dimensions.stream().map(SweepDimensionEmbeddable::toDomain).toList() : null);
    }
}
