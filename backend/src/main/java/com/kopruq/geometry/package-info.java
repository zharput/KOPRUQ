/**
 * Spatial Core - coordinate-system and point primitives shared by the
 * site/corridor/layout domain (docs/site-layout-platform-analysis.md
 * section C). No dependency on any other module; every other new
 * spatial module ({@code alignment}, {@code terrain}, {@code
 * constraints}, ...) depends on this one, never the reverse.
 *
 * <p>{@link com.kopruq.geometry.model.CoordinateSystem},
 * {@link com.kopruq.geometry.model.Point3D}.
 */
package com.kopruq.geometry;
