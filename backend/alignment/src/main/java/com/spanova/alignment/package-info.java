/**
 * Alignment - converts between chainage-based positions and real-world
 * XYZ coordinates (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section C, E,
 * addendum Q). Depends only on {@code spatial-core}. No Spring, no
 * solver, no site/terrain dependency.
 *
 * <p>{@link com.spanova.alignment.Alignment},
 * {@link com.spanova.alignment.ChainagePosition},
 * {@link com.spanova.alignment.HorizontalElement},
 * {@link com.spanova.alignment.StraightElement} - only straight
 * horizontal geometry so far, no vertical alignment yet.
 */
package com.spanova.alignment;
