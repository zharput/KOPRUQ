package com.spanova.api.fastsolver;

/** Displacement at one named deck-spine node (m, rad), for the results table. */
public record DeckDisplacementRow(String label, double chainageM, double dx, double dy, double dz, double rx, double ry, double rz) {
}
