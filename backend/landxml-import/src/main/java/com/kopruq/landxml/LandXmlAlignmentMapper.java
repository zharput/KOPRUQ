package com.kopruq.landxml;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.CurveElement;
import com.kopruq.alignment.HorizontalElement;
import com.kopruq.alignment.StraightElement;
import com.kopruq.spatialcore.Point3D;

import java.util.ArrayList;
import java.util.List;

/** Maps a {@link LandXmlAlignment} to KOPRUQ's own {@link Alignment}. Spiral elements never reach this mapper - {@link LandXmlParser} already skips them with a warning. */
public final class LandXmlAlignmentMapper {

    public Alignment toAlignment(LandXmlAlignment landXmlAlignment) {
        List<HorizontalElement> elements = new ArrayList<>(landXmlAlignment.elements().size());
        for (LandXmlGeometryElement element : landXmlAlignment.elements()) {
            elements.add(toHorizontalElement(element));
        }
        return new Alignment(elements);
    }

    private static HorizontalElement toHorizontalElement(LandXmlGeometryElement element) {
        return switch (element) {
            case LandXmlLine line -> new StraightElement(
                    new Point3D(line.startX(), line.startY(), 0),
                    new Point3D(line.endX(), line.endY(), 0));
            case LandXmlCurve curve -> new CurveElement(
                    new Point3D(curve.startX(), curve.startY(), 0),
                    new Point3D(curve.endX(), curve.endY(), 0),
                    new Point3D(curve.centerX(), curve.centerY(), 0),
                    curve.radiusM(),
                    curve.clockwise());
        };
    }
}
