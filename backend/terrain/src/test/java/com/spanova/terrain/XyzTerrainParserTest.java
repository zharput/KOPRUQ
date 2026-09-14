package com.spanova.terrain;

import com.spanova.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class XyzTerrainParserTest {

    @Test
    void parsesWhitespaceAndCommaSeparatedLinesAndSkipsNonNumericRows() {
        String text = "X Y Z\n0 0 1.5\n1.5,2.5,3.5\n\nbad row\n10   20   30\n";

        List<Point3D> points = XyzTerrainParser.parse(text);

        assertEquals(3, points.size());
        assertEquals(new Point3D(0, 0, 1.5), points.get(0));
        assertEquals(new Point3D(1.5, 2.5, 3.5), points.get(1));
        assertEquals(new Point3D(10, 20, 30), points.get(2));
    }
}
