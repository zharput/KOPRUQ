package com.spanova.landxml;

/** Whether a coordinate reference system could be determined from the file - never silently assumed (spec section 22). */
public enum CrsStatus {
    RESOLVED,
    REVIEW_REQUIRED
}
