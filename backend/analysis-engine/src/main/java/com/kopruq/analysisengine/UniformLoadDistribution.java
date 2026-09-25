package com.kopruq.analysisengine;

/**
 * Converts a uniformly distributed load (UDL) on a beam element into the
 * standard "fixed-end force" equivalent nodal load vector, in global
 * coordinates - the same closed-form result any direct-stiffness FEM
 * text uses for a member load (e.g. McGuire/Gallagher/Ziemian; used here
 * for both self-weight and externally-supplied UDLs like SDL, since both
 * are just "a UDL on this element" once their magnitude/direction is
 * known).
 */
final class UniformLoadDistribution {

    private UniformLoadDistribution() {
    }

    /**
     * @param globalUdl force per unit length in global (x, y, z), kN/m
     * @param rotation3x3 the element's local-axis rotation matrix (see {@link FrameTransformation})
     * @return 12-length equivalent nodal load vector, in GLOBAL DOF order [node i: dx,dy,dz,rx,ry,rz; node j: same]
     */
    static double[] equivalentNodalLoadsGlobal(double[] globalUdl, double[][] rotation3x3, double length) {
        double[] localUdl = MatrixUtils.multiply(rotation3x3, globalUdl);
        double qx = localUdl[0];
        double qy = localUdl[1];
        double qz = localUdl[2];

        double[] local = new double[12];

        // Axial (uniform load along the member itself - splits evenly).
        local[0] = qx * length / 2.0;
        local[6] = qx * length / 2.0;

        // Bending about local z, from a UDL in local y.
        local[1] = qy * length / 2.0;
        local[5] = qy * length * length / 12.0;
        local[7] = qy * length / 2.0;
        local[11] = -qy * length * length / 12.0;

        // Bending about local y, from a UDL in local z.
        local[2] = qz * length / 2.0;
        local[4] = -qz * length * length / 12.0;
        local[8] = qz * length / 2.0;
        local[10] = qz * length * length / 12.0;

        double[][] t12 = FrameTransformation.transformationMatrix12(rotation3x3);
        return MatrixUtils.multiply(MatrixUtils.transpose(t12), local);
    }
}
