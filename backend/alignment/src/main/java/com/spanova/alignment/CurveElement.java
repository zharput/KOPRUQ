package com.spanova.alignment;

import com.spanova.spatialcore.Point3D;

/**
 * A circular-arc horizontal alignment segment (LANDXML-P01,
 * docs/roadmap.md) - standard closed-form circular-arc geometry, safe
 * to implement without engineering sign-off (spec section 22). Transition
 * (spiral/clothoid) curves are NOT this - they still need the engineer's
 * own clothoid parameterization convention before they can be added,
 * exactly as {@link HorizontalElement}'s javadoc already stated before
 * this class existed.
 *
 * <p>{@code center}/{@code radiusM} define the circle; {@code start}/
 * {@code end} must both lie on it (not re-derived - taken as given, same
 * as a LandXML {@code <Curve>} element's own redundant Start/Center/End/
 * Radius fields). {@code clockwise} is the direction of travel from
 * {@code start} to {@code end} (LandXML's {@code rot="cw"|"ccw"}).
 *
 * <p>The z-coordinates on {@code start}/{@code end}/{@code center} are
 * unused, same convention as {@link StraightElement}.
 */
public record CurveElement(Point3D start, Point3D end, Point3D center, double radiusM, boolean clockwise)
        implements HorizontalElement {
}
