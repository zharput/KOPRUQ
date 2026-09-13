package com.spanova.alignment;

/**
 * One piece of horizontal alignment geometry.
 *
 * <p>Only {@link StraightElement} is implemented so far - the revised
 * LAYOUT-P01 milestone (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section M,
 * addendum Q) needs a straight alignment only. Circular arcs are
 * deferred until needed; transition curves additionally need the
 * engineer's clothoid parameterization convention before they can be
 * added (spec section 22 - never invent it).
 */
public sealed interface HorizontalElement permits StraightElement {
}
