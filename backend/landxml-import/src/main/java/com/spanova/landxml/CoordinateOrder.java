package com.spanova.landxml;
import com.spanova.spatialcore.Point3D;
/** Explicit source tuple to engineering mapping. Parser x/y retains the legacy NE interpretation. */
public enum CoordinateOrder {
    FIRST_X_SECOND_Y, FIRST_Y_SECOND_X;
    public Point3D map(LandXmlPoint point) {
        return this == FIRST_X_SECOND_Y ? new Point3D(point.y(), point.x(), point.z())
                : new Point3D(point.x(), point.y(), point.z());
    }
}
