package com.kopruq.analysis.model;

/**
 * A support (constraint) at one node - translation and rotation
 * restraints only. P01 scope: simple pin/roller supports: warping
 * torsion restraint is not modelled - not needed for a
 * simple beam and would be an invented value if guessed.
 */
public record BoundaryCondition(
        int nodeId,
        boolean dx, boolean dy, boolean dz,
        boolean rx, boolean ry, boolean rz) {
}
