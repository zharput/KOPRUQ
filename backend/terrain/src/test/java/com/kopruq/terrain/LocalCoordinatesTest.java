package com.kopruq.terrain;

import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class LocalCoordinatesTest {

    @Test
    void subtractsTheOriginFromEveryPoint_flatXyzOrder() {
        Point3D origin = new Point3D(1000.0, 2000.0, 30.0);
        List<Point3D> points = List.of(new Point3D(1000.0, 2000.0, 30.0), new Point3D(1010.5, 2020.25, 35.0));
        assertArrayEquals(new double[] {0.0, 0.0, 0.0, 10.5, 20.25, 5.0},
                LocalCoordinates.relativePositions(points, origin), 0.0);
    }

    @Test
    void emptyInputGivesAnEmptyArray() {
        assertEquals(0, LocalCoordinates.relativePositions(List.of(), new Point3D(1, 2, 3)).length);
    }
}
