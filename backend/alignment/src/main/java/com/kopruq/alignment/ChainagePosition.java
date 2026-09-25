package com.kopruq.alignment;

/**
 * A position expressed relative to an {@link Alignment}: distance along
 * the alignment ({@code chainageM}), perpendicular distance from it
 * ({@code offsetM}, positive to the right of the direction of travel),
 * and elevation.
 *
 * <p>Elevation is supplied directly by the caller for now - no vertical
 * alignment model exists yet (see {@link Alignment}'s class javadoc).
 */
public record ChainagePosition(double chainageM, double offsetM, double elevationM) {
}
