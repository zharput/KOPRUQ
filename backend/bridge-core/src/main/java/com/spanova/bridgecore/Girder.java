package com.spanova.bridgecore;

/**
 * Superstructure girder sizing for one bridge alternative (spec section
 * 9). Prototype scope is the first bridge type only - PRECAST GIRDER
 * VIADUCT (spec section 8) - so one uniform girder type per alternative.
 */
public record Girder(int count, double depthM, double spacingM) {
}
