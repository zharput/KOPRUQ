package com.kopruq.landxml.infra.persistence;

import com.kopruq.alignment.model.CurveElement;
import com.kopruq.alignment.model.HorizontalElement;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.geometry.model.Point3D;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * One horizontal alignment element: a row of {@code landxml_alignment_element} (ordered by its {@code ordinal}
 * column). STRAIGHT rows leave the curve columns null; CURVE rows fill them.
 */
@Embeddable
class AlignmentElementEntity {

    static final String STRAIGHT = "STRAIGHT";
    static final String CURVE = "CURVE";

    @Column(name = "kind", nullable = false, length = 16)
    private String kind;
    @Column(name = "start_x", nullable = false)
    private double startX;
    @Column(name = "start_y", nullable = false)
    private double startY;
    @Column(name = "start_z", nullable = false)
    private double startZ;
    @Column(name = "end_x", nullable = false)
    private double endX;
    @Column(name = "end_y", nullable = false)
    private double endY;
    @Column(name = "end_z", nullable = false)
    private double endZ;
    @Column(name = "center_x")
    private Double centerX;
    @Column(name = "center_y")
    private Double centerY;
    @Column(name = "center_z")
    private Double centerZ;
    @Column(name = "radius_m")
    private Double radiusM;
    @Column(name = "clockwise")
    private Boolean clockwise;

    protected AlignmentElementEntity() {
    }

    static AlignmentElementEntity from(HorizontalElement element) {
        AlignmentElementEntity e = new AlignmentElementEntity();
        switch (element) {
            case StraightElement s -> {
                e.kind = STRAIGHT;
                e.setStartEnd(s.start(), s.end());
            }
            case CurveElement c -> {
                e.kind = CURVE;
                e.setStartEnd(c.start(), c.end());
                e.centerX = c.center().x();
                e.centerY = c.center().y();
                e.centerZ = c.center().z();
                e.radiusM = c.radiusM();
                e.clockwise = c.clockwise();
            }
        }
        return e;
    }

    private void setStartEnd(Point3D start, Point3D end) {
        this.startX = start.x();
        this.startY = start.y();
        this.startZ = start.z();
        this.endX = end.x();
        this.endY = end.y();
        this.endZ = end.z();
    }

    HorizontalElement toDomain() {
        Point3D start = new Point3D(startX, startY, startZ);
        Point3D end = new Point3D(endX, endY, endZ);
        if (STRAIGHT.equals(kind)) {
            return new StraightElement(start, end);
        }
        if (CURVE.equals(kind)) {
            if (centerX == null || centerY == null || centerZ == null || radiusM == null || clockwise == null) {
                throw new IllegalStateException("Stored CURVE alignment element is missing center/radius/clockwise");
            }
            return new CurveElement(start, end, new Point3D(centerX, centerY, centerZ), radiusM, clockwise);
        }
        throw new IllegalStateException("Stored alignment element has unknown kind " + kind);
    }
}
