package com.kopruq.terrain.infra.persistence;

import com.kopruq.terrain.model.TerrainSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** Import diagnostics of a terrain (0..1 per terrain; absent for e.g. XYZ imports). */
@Entity
@Table(name = "terrain_source")
class TerrainSourceEntity {

    @Id
    @Column(name = "terrain_id", length = 36)
    private String terrainId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "terrain_id")
    private TerrainEntity terrain;

    @Column(name = "application")
    private String application;
    @Column(name = "format_version")
    private String formatVersion;
    @Column(name = "units")
    private String units;
    @Column(name = "surface_name")
    private String surfaceName;
    @Column(name = "coordinate_order")
    private String coordinateOrder;
    @Column(name = "source_point_count", nullable = false)
    private int sourcePointCount;
    @Column(name = "source_face_count", nullable = false)
    private int sourceFaceCount;
    @Column(name = "invalid_points", nullable = false)
    private int invalidPoints;
    @Column(name = "duplicate_point_ids", nullable = false)
    private int duplicatePointIds;
    @Column(name = "invalid_faces", nullable = false)
    private int invalidFaces;
    @Column(name = "missing_point_references", nullable = false)
    private int missingPointReferences;
    @Column(name = "degenerate_faces", nullable = false)
    private int degenerateFaces;

    protected TerrainSourceEntity() {
    }

    TerrainSourceEntity(TerrainEntity terrain) {
        this.terrain = terrain;
    }

    void apply(TerrainSource s) {
        this.application = s.application();
        this.formatVersion = s.formatVersion();
        this.units = s.units();
        this.surfaceName = s.surfaceName();
        this.coordinateOrder = s.coordinateOrder();
        this.sourcePointCount = s.sourcePointCount();
        this.sourceFaceCount = s.sourceFaceCount();
        this.invalidPoints = s.invalidPoints();
        this.duplicatePointIds = s.duplicatePointIds();
        this.invalidFaces = s.invalidFaces();
        this.missingPointReferences = s.missingPointReferences();
        this.degenerateFaces = s.degenerateFaces();
    }

    TerrainSource toDomain() {
        return new TerrainSource(application, formatVersion, units, surfaceName, coordinateOrder, sourcePointCount,
                sourceFaceCount, invalidPoints, duplicatePointIds, invalidFaces, missingPointReferences, degenerateFaces);
    }
}
