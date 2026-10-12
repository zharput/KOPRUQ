package com.kopruq.terrain.infra.persistence;

import com.kopruq.terrain.model.TerrainBreakline;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One breakline of a terrain: a row of {@code terrain_breakline} (ordered by its {@code ordinal} column). */
@Embeddable
class TerrainBreaklineEntity {

    @Column(name = "name")
    private String name;
    @Column(name = "point_count", nullable = false)
    private int pointCount;
    @Column(name = "points", nullable = false)
    private byte[] points;

    protected TerrainBreaklineEntity() {
    }

    static TerrainBreaklineEntity from(TerrainBreakline b) {
        TerrainBreaklineEntity e = new TerrainBreaklineEntity();
        e.name = b.name();
        e.pointCount = b.points().size();
        e.points = TinBinaryCodec.encodePoints(b.points());
        return e;
    }

    TerrainBreakline toDomain() {
        return new TerrainBreakline(name, TinBinaryCodec.decodePoints(points, pointCount, "breakline " + name));
    }
}
