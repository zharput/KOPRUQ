package com.kopruq.terrain.infra.persistence;

import com.kopruq.geometry.model.CoordinateSystem;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.terrain.enums.TerrainStatus;
import com.kopruq.terrain.model.TerrainBoundary;
import com.kopruq.terrain.model.TerrainBreakline;
import com.kopruq.terrain.model.TerrainModel;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.util.ArrayList;
import java.util.List;

/**
 * Persistent form of a {@link TerrainModel}. Kept apart from the framework-free record on purpose: the record stays in
 * {@code terrain.model}; this class and its mapping live only in {@code terrain.infra.persistence}.
 * Vertices/triangles are binary blobs (see {@link TinBinaryCodec}); lengths are SI metres.
 */
@Entity
@Table(name = "terrain")
class TerrainEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    /** Distinguishes a null {@code CoordinateSystem} from a {@code CoordinateSystem(null, null)}. */
    @Column(name = "has_coordinate_system", nullable = false)
    private boolean hasCoordinateSystem;
    @Column(name = "crs_epsg_code")
    private String crsEpsgCode;
    @Column(name = "crs_name")
    private String crsName;

    @Column(name = "source_type")
    private String sourceType;
    @Column(name = "source_file_name")
    private String sourceFileName;

    @Column(name = "bounds_min_x", nullable = false)
    private double boundsMinX;
    @Column(name = "bounds_min_y", nullable = false)
    private double boundsMinY;
    @Column(name = "bounds_min_z", nullable = false)
    private double boundsMinZ;
    @Column(name = "bounds_max_x", nullable = false)
    private double boundsMaxX;
    @Column(name = "bounds_max_y", nullable = false)
    private double boundsMaxY;
    @Column(name = "bounds_max_z", nullable = false)
    private double boundsMaxZ;
    @Column(name = "min_elevation_m", nullable = false)
    private double minElevationM;
    @Column(name = "max_elevation_m", nullable = false)
    private double maxElevationM;
    @Column(name = "local_origin_x", nullable = false)
    private double localOriginX;
    @Column(name = "local_origin_y", nullable = false)
    private double localOriginY;
    @Column(name = "local_origin_z", nullable = false)
    private double localOriginZ;

    @Column(name = "version", nullable = false)
    private int modelVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private TerrainStatus status;

    @Column(name = "vertex_count", nullable = false)
    private int vertexCount;
    @Column(name = "vertices", nullable = false)
    private byte[] vertices;
    @Column(name = "triangle_count", nullable = false)
    private int triangleCount;
    @Column(name = "triangles", nullable = false)
    private byte[] triangles;

    /** Technical optimistic-lock counter only; not a domain revision. */
    @Version
    @Column(name = "row_version", nullable = false)
    private Long rowVersion;

    @OneToOne(mappedBy = "terrain", cascade = CascadeType.ALL, orphanRemoval = true)
    private TerrainSourceEntity source;

    @ElementCollection
    @CollectionTable(name = "terrain_boundary", joinColumns = @JoinColumn(name = "terrain_id"))
    @OrderColumn(name = "ordinal")
    private List<TerrainBoundaryEntity> boundaries = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "terrain_breakline", joinColumns = @JoinColumn(name = "terrain_id"))
    @OrderColumn(name = "ordinal")
    private List<TerrainBreaklineEntity> breaklines = new ArrayList<>();

    protected TerrainEntity() {
    }

    TerrainEntity(String id) {
        this.id = id;
    }

    String getId() {
        return id;
    }

    /** Copies every field of the domain terrain into this entity (new or existing). */
    void apply(TerrainModel t) {
        this.projectId = t.projectId();
        CoordinateSystem crs = t.coordinateSystem();
        this.hasCoordinateSystem = crs != null;
        this.crsEpsgCode = crs == null ? null : crs.epsgCode();
        this.crsName = crs == null ? null : crs.name();
        this.sourceType = t.sourceType();
        this.sourceFileName = t.sourceFileName();
        this.boundsMinX = t.boundsMin().x();
        this.boundsMinY = t.boundsMin().y();
        this.boundsMinZ = t.boundsMin().z();
        this.boundsMaxX = t.boundsMax().x();
        this.boundsMaxY = t.boundsMax().y();
        this.boundsMaxZ = t.boundsMax().z();
        this.minElevationM = t.minElevationM();
        this.maxElevationM = t.maxElevationM();
        this.localOriginX = t.localOrigin().x();
        this.localOriginY = t.localOrigin().y();
        this.localOriginZ = t.localOrigin().z();
        this.modelVersion = t.version();
        this.status = t.status();
        this.vertexCount = t.vertices().size();
        this.vertices = TinBinaryCodec.encodePoints(t.vertices());
        this.triangleCount = t.triangles().size();
        this.triangles = TinBinaryCodec.encodeTriangles(t.triangles());

        if (t.source() == null) {
            this.source = null;
        } else {
            if (this.source == null) {
                this.source = new TerrainSourceEntity(this);
            }
            this.source.apply(t.source());
        }

        this.boundaries.clear();
        for (TerrainBoundary b : t.boundaries()) {
            this.boundaries.add(TerrainBoundaryEntity.from(b));
        }
        this.breaklines.clear();
        for (TerrainBreakline b : t.breaklines()) {
            this.breaklines.add(TerrainBreaklineEntity.from(b));
        }
    }

    /** Rebuilds the domain terrain; the stored blobs are validated while decoding. */
    TerrainModel toDomain() {
        List<Point3D> decodedVertices = TinBinaryCodec.decodePoints(vertices, vertexCount, "terrain " + id + " vertices");
        return new TerrainModel(
                id,
                projectId,
                hasCoordinateSystem ? new CoordinateSystem(crsEpsgCode, crsName) : null,
                sourceType,
                sourceFileName,
                new Point3D(boundsMinX, boundsMinY, boundsMinZ),
                new Point3D(boundsMaxX, boundsMaxY, boundsMaxZ),
                minElevationM,
                maxElevationM,
                decodedVertices,
                TinBinaryCodec.decodeTriangles(triangles, triangleCount, vertexCount, "terrain " + id + " triangles"),
                new Point3D(localOriginX, localOriginY, localOriginZ),
                modelVersion,
                status,
                boundaries.stream().map(TerrainBoundaryEntity::toDomain).toList(),
                breaklines.stream().map(TerrainBreaklineEntity::toDomain).toList(),
                source == null ? null : source.toDomain());
    }
}
