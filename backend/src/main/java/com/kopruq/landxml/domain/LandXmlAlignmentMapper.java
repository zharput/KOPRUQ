package com.kopruq.landxml.domain;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.CurveElement;
import com.kopruq.alignment.model.HorizontalElement;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.model.LandXmlAlignment;
import com.kopruq.landxml.model.LandXmlCurve;
import com.kopruq.landxml.model.LandXmlGeometryElement;
import com.kopruq.landxml.model.LandXmlLine;

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
