package com.spanova.alignment;

import com.spanova.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AlignmentTest {

    private static final double EPS = 1e-9;

    // Straight alignment due east, 100 m: (0,0,0) -> (100,0,0).
    private static Alignment eastward100m() {
        return new Alignment(List.of(new StraightElement(
                new Point3D(0, 0, 0), new Point3D(100, 0, 0))));
    }

    // Straight alignment due north, 100 m: (0,0,0) -> (0,100,0).
    private static Alignment northward100m() {
        return new Alignment(List.of(new StraightElement(
                new Point3D(0, 0, 0), new Point3D(0, 100, 0))));
    }

    @Test
    void totalLengthM_isHorizontalLengthOfElements() {
        assertEquals(100, eastward100m().totalLengthM(), EPS);
    }

    @Test
    void toXYZ_atStart_returnsStartPointWithGivenElevation() {
        Point3D p = eastward100m().toXYZ(new ChainagePosition(0, 0, 5));
        assertEquals(0, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
        assertEquals(5, p.z(), EPS);
    }

    @Test
    void toXYZ_atMidpoint_interpolatesLinearly() {
        Point3D p = eastward100m().toXYZ(new ChainagePosition(50, 0, 5));
        assertEquals(50, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
        assertEquals(5, p.z(), EPS);
    }

    @Test
    void toXYZ_atEnd_returnsEndPoint() {
        Point3D p = eastward100m().toXYZ(new ChainagePosition(100, 0, 0));
        assertEquals(100, p.x(), EPS);
        assertEquals(0, p.y(), EPS);
    }

    @Test
    void toXYZ_positiveOffset_isToTheRightOfEastwardTravel() {
        // Facing east, "right" is south (-y).
        Point3D p = eastward100m().toXYZ(new ChainagePosition(50, 10, 0));
        assertEquals(50, p.x(), EPS);
        assertEquals(-10, p.y(), EPS);
    }

    @Test
    void toXYZ_positiveOffset_isToTheRightOfNorthwardTravel() {
        // Facing north, "right" is east (+x).
        Point3D p = northward100m().toXYZ(new ChainagePosition(50, 10, 0));
        assertEquals(10, p.x(), EPS);
        assertEquals(50, p.y(), EPS);
    }

    @Test
    void toXYZ_outsideAlignment_throws() {
        Alignment alignment = eastward100m();
        assertThrows(IllegalArgumentException.class, () -> alignment.toXYZ(new ChainagePosition(150, 0, 0)));
        assertThrows(IllegalArgumentException.class, () -> alignment.toXYZ(new ChainagePosition(-1, 0, 0)));
    }

    @Test
    void toChainage_pointOnCenterline_hasZeroOffset() {
        ChainagePosition pos = eastward100m().toChainage(new Point3D(30, 0, 2));
        assertEquals(30, pos.chainageM(), EPS);
        assertEquals(0, pos.offsetM(), EPS);
        assertEquals(2, pos.elevationM(), EPS);
    }

    @Test
    void toChainage_pointOffCenterline_recoversSignedOffset() {
        // South of the eastward centerline -> positive offset (right side).
        ChainagePosition pos = eastward100m().toChainage(new Point3D(30, -5, 2));
        assertEquals(30, pos.chainageM(), EPS);
        assertEquals(5, pos.offsetM(), EPS);
    }

    @Test
    void toChainage_isInverseOfToXYZ_forPointsOnAlignment() {
        Alignment alignment = eastward100m();
        ChainagePosition original = new ChainagePosition(42, 7, 3);

        Point3D xyz = alignment.toXYZ(original);
        ChainagePosition recovered = alignment.toChainage(xyz);

        assertEquals(original.chainageM(), recovered.chainageM(), EPS);
        assertEquals(original.offsetM(), recovered.offsetM(), EPS);
        assertEquals(original.elevationM(), recovered.elevationM(), EPS);
    }

    @Test
    void toChainage_beyondSegmentEnd_clampsToNearestPoint() {
        ChainagePosition pos = eastward100m().toChainage(new Point3D(150, 0, 0));
        assertEquals(100, pos.chainageM(), EPS);
        assertEquals(0, pos.offsetM(), EPS);
    }

    @Test
    void constructor_rejectsEmptyElementList() {
        assertThrows(IllegalArgumentException.class, () -> new Alignment(List.of()));
    }
}
