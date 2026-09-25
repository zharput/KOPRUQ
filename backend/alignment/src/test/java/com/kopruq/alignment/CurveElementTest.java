package com.kopruq.alignment;

import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CurveElementTest {

    private static final double EPS = 1e-6;

    // Quarter circle, radius 10, center at origin, counterclockwise from (10,0) to (0,10).
    // Arc length = (pi/2) * 10 = 5*pi.
    private static Alignment quarterCircleCcw() {
        return new Alignment(List.of(new CurveElement(
                new Point3D(10, 0, 0), new Point3D(0, 10, 0), new Point3D(0, 0, 0), 10, false)));
    }

    // Quarter circle, radius 10, center at origin, clockwise from (10,0) to (0,-10).
    private static Alignment quarterCircleCw() {
        return new Alignment(List.of(new CurveElement(
                new Point3D(10, 0, 0), new Point3D(0, -10, 0), new Point3D(0, 0, 0), 10, true)));
    }

    @Test
    void totalLengthM_isArcLength() {
        assertEquals(10 * Math.PI / 2, quarterCircleCcw().totalLengthM(), EPS);
    }

    @Test
    void toXYZ_atStart_returnsStartPoint() {
        Point3D p = quarterCircleCcw().toXYZ(new ChainagePosition(0, 0, 0));
        assertEquals(10, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
    }

    @Test
    void toXYZ_atEnd_returnsEndPoint() {
        double arcLength = 10 * Math.PI / 2;
        Point3D p = quarterCircleCcw().toXYZ(new ChainagePosition(arcLength, 0, 0));
        assertEquals(0, p.x(), EPS);
        assertEquals(10, p.y(), EPS);
    }

    @Test
    void toXYZ_atMidpoint_liesOnTheCircle() {
        double arcLength = 10 * Math.PI / 2;
        Point3D p = quarterCircleCcw().toXYZ(new ChainagePosition(arcLength / 2, 0, 0));
        // Midpoint of a CCW quarter circle from angle 0 to pi/2 is at angle pi/4.
        assertEquals(10 * Math.cos(Math.PI / 4), p.x(), EPS);
        assertEquals(10 * Math.sin(Math.PI / 4), p.y(), EPS);
        // Must be exactly radius 10 from the center.
        assertEquals(10, Math.hypot(p.x(), p.y()), EPS);
    }

    @Test
    void toXYZ_positiveOffsetOnCounterclockwiseCurve_isAwayFromCenter() {
        // CCW: positive (right-of-travel) offset points away from the center.
        Point3D p = quarterCircleCcw().toXYZ(new ChainagePosition(0, 5, 0));
        // At the start (10,0), tangent for CCW travel is (0,1); right is (1,0) -> away from center.
        assertEquals(15, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
    }

    @Test
    void toXYZ_positiveOffsetOnClockwiseCurve_isTowardTheCenter() {
        // CW: positive (right-of-travel) offset points toward the center.
        Point3D p = quarterCircleCw().toXYZ(new ChainagePosition(0, 5, 0));
        // At the start (10,0), tangent for CW travel is (0,-1); right is (-1,0) -> toward center.
        assertEquals(5, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
    }

    @Test
    void toChainage_isInverseOfToXYZ_forPointsOnTheArc() {
        Alignment alignment = quarterCircleCcw();
        double arcLength = 10 * Math.PI / 2;
        double chainageM = arcLength * 0.3;

        Point3D xyz = alignment.toXYZ(new ChainagePosition(chainageM, 0, 2));
        ChainagePosition recovered = alignment.toChainage(xyz);

        assertEquals(chainageM, recovered.chainageM(), EPS);
        assertEquals(0, recovered.offsetM(), EPS);
    }

    @Test
    void toChainage_recoversOffsetOnTheArc() {
        Alignment alignment = quarterCircleCcw();
        Point3D onArcWithOffset = alignment.toXYZ(new ChainagePosition(5, 3, 0));

        ChainagePosition recovered = alignment.toChainage(onArcWithOffset);

        assertEquals(5, recovered.chainageM(), EPS);
        assertEquals(3, recovered.offsetM(), EPS);
    }
}
