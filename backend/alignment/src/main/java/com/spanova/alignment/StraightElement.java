package com.spanova.alignment;

import com.spanova.spatialcore.Point3D;

/**
 * A straight horizontal alignment segment from {@code start} to
 * {@code end}.
 *
 * <p>The z-coordinate on {@code start}/{@code end} is currently unused -
 * {@link Alignment} takes elevation directly from {@link
 * ChainagePosition#elevationM()} instead (no vertical alignment model
 * exists yet). Kept as {@link Point3D} rather than a 2D point so this
 * type does not need to change shape once a vertical alignment is added.
 */
public record StraightElement(Point3D start, Point3D end) implements HorizontalElement {
}
