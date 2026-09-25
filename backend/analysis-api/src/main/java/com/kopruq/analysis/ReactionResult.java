package com.kopruq.analysis;

/** Support reaction at one node, in global axes (force in kN, moment in kN.m). */
public record ReactionResult(int nodeId, double fx, double fy, double fz, double mx, double my, double mz) {
}
