package com.spanova.analysis;

/** Displacement at one node, in global axes (translation in m, rotation in rad). */
public record DisplacementResult(int nodeId, double dx, double dy, double dz, double rx, double ry, double rz) {
}
