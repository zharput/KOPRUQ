package com.kopruq.alignment;

/**
 * One piece of horizontal alignment geometry.
 *
 * <p>{@link StraightElement} (LAYOUT-P01) and {@link CurveElement}
 * (circular arcs, LANDXML-P01 - docs/roadmap.md) are implemented.
 * Transition curves (spirals/clothoids) are still deferred - they need
 * the engineer's own clothoid parameterization convention before they
 * can be added (spec section 22 - never invent it); circular arcs are
 * standard closed-form geometry and don't carry that same risk.
 */
public sealed interface HorizontalElement permits StraightElement, CurveElement {
}
