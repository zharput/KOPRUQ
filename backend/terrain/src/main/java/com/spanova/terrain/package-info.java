/**
 * Terrain domain - a triangulated surface (TIN) imported from a DTM
 * point file, queryable for elevation at (x,y). Reactivates the
 * TerrainModel design from docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * sections C-F, deliberately deactivated by "addendum Q" until real
 * DTM data existed. TERRAIN-P01 (docs/roadmap.md): import + query +
 * mesh export only - no terrain-driven abutment/pier placement yet
 * ({@code BridgeLayoutEngine} is untouched by this module), no
 * tiling/LOD, no satellite imagery.
 *
 * <p>No dependency on Spring, and JTS is an internal implementation
 * detail (used only inside {@link com.spanova.terrain.TerrainImportService})
 * - not exposed anywhere in this package's public API, matching
 * {@code bridge-core}'s framework-independence discipline. Depends
 * only on {@code spatial-core} for {@link com.spanova.spatialcore.Point3D}/
 * {@link com.spanova.spatialcore.CoordinateSystem}.
 */
package com.spanova.terrain;
