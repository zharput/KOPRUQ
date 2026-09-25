/**
 * Alignment - converts between chainage-based positions and real-world
 * XYZ coordinates (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section C, E,
 * addendum Q). Depends only on {@code spatial-core}. No Spring, no
 * solver, no site/terrain dependency.
 *
 * <p>{@link com.kopruq.alignment.Alignment},
 * {@link com.kopruq.alignment.ChainagePosition},
 * {@link com.kopruq.alignment.HorizontalElement},
 * {@link com.kopruq.alignment.StraightElement} - only straight
 * horizontal geometry so far, no vertical alignment yet.
 */
package com.kopruq.alignment;
