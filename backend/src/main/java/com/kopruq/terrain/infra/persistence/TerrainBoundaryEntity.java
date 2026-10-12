package com.kopruq.terrain.infra.persistence;

import com.kopruq.terrain.model.TerrainBoundary;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One supporting boundary of a terrain: a row of {@code terrain_boundary} (ordered by its {@code ordinal} column). */
@Embeddable
class TerrainBoundaryEntity {

    @Column(name = "name")
    private String name;
    @Column(name = "type")
    private String type;
    @Column(name = "edge_trim", nullable = false)
    private boolean edgeTrim;
    @Column(name = "point_count", nullable = false)
    private int pointCount;
    @Column(name = "points", nullable = false)
    private byte[] points;

    protected TerrainBoundaryEntity() {
    }

    static TerrainBoundaryEntity from(TerrainBoundary b) {
        TerrainBoundaryEntity e = new TerrainBoundaryEntity();
        e.name = b.name();
        e.type = b.type();
        e.edgeTrim = b.edgeTrim();
        e.pointCount = b.points().size();
        e.points = TinBinaryCodec.encodePoints(b.points());
        return e;
    }

    TerrainBoundary toDomain() {
        return new TerrainBoundary(name, type, edgeTrim,
                TinBinaryCodec.decodePoints(points, pointCount, "boundary " + name));
    }
}
