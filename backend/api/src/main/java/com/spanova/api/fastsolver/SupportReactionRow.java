package com.spanova.api.fastsolver;

/** Reaction at one named support (kN, kN.m), for the results table. */
public record SupportReactionRow(String label, double chainageM, double fx, double fy, double fz, double mx, double my, double mz) {
}
