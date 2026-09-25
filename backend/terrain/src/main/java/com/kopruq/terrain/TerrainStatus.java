package com.kopruq.terrain;

/**
 * Lifecycle status of a {@link TerrainModel}. TERRAIN-P01 only ever
 * produces {@link #IMPORTED} - staleness/recalculation states (for when
 * a terrain update should invalidate dependent bridge layouts) are a
 * later milestone, not implemented here.
 */
public enum TerrainStatus {
    IMPORTED, VALID, REVIEW_REQUIRED
}
