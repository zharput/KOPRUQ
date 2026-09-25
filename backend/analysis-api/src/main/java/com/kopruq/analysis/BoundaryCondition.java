package com.kopruq.analysis;

/**
 * A support (constraint) at one node - translation and rotation
 * restraints only. MIDAS-P01 scope: simple pin/roller supports: warping
 * torsion restraint (MIDAS's "RW") is not modelled - not needed for a
 * simple beam and would be an invented value if guessed.
 */
public record BoundaryCondition(
        int nodeId,
        boolean dx, boolean dy, boolean dz,
        boolean rx, boolean ry, boolean rz) {
}
