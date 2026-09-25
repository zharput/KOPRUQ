package com.kopruq.analysisengine;

/**
 * Local 12x12 stiffness matrix for a 3D Euler-Bernoulli frame element
 * (no shear deformation) - the standard, widely published form (e.g.
 * Przemieniecki, "Theory of Matrix Structural Analysis"; McGuire/
 * Gallagher/Ziemian, "Matrix Structural Analysis"). A computational
 * method, not an engineering judgment call, so it needs no engineer
 * sign-off (spec section 22's own carve-out) - correctness is instead
 * verified by {@code FrameElementStiffnessTest}/{@code KopruqAnalysisEngineTest}
 * against textbook closed-form results.
 *
 * <p>DOF order per node: [dx, dy, dz, rx, ry, rz] (translation then
 * rotation, local axes) - 12 DOF total for a 2-node element.
 */
final class FrameElementStiffness {

    private FrameElementStiffness() {
    }

    static double[][] local(double e, double g, double a, double iy, double iz, double j, double length) {
        double[][] k = new double[12][12];

        double ea_l = e * a / length;
        double gj_l = g * j / length;

        double ez_12 = 12 * e * iz / Math.pow(length, 3);
        double ez_6 = 6 * e * iz / Math.pow(length, 2);
        double ez_4 = 4 * e * iz / length;
        double ez_2 = 2 * e * iz / length;

        double ey_12 = 12 * e * iy / Math.pow(length, 3);
        double ey_6 = 6 * e * iy / Math.pow(length, 2);
        double ey_4 = 4 * e * iy / length;
        double ey_2 = 2 * e * iy / length;

        // Axial: u1 (0), u2 (6)
        k[0][0] = ea_l;
        k[0][6] = -ea_l;
        k[6][0] = -ea_l;
        k[6][6] = ea_l;

        // Torsion: rx1 (3), rx2 (9)
        k[3][3] = gj_l;
        k[3][9] = -gj_l;
        k[9][3] = -gj_l;
        k[9][9] = gj_l;

        // Bending about local z (in x-y plane): v1(1), rz1(5), v2(7), rz2(11)
        k[1][1] = ez_12;
        k[1][5] = ez_6;
        k[1][7] = -ez_12;
        k[1][11] = ez_6;
        k[5][1] = ez_6;
        k[5][5] = ez_4;
        k[5][7] = -ez_6;
        k[5][11] = ez_2;
        k[7][1] = -ez_12;
        k[7][5] = -ez_6;
        k[7][7] = ez_12;
        k[7][11] = -ez_6;
        k[11][1] = ez_6;
        k[11][5] = ez_2;
        k[11][7] = -ez_6;
        k[11][11] = ez_4;

        // Bending about local y (in x-z plane): w1(2), ry1(4), w2(8), ry2(10)
        k[2][2] = ey_12;
        k[2][4] = -ey_6;
        k[2][8] = -ey_12;
        k[2][10] = -ey_6;
        k[4][2] = -ey_6;
        k[4][4] = ey_4;
        k[4][8] = ey_6;
        k[4][10] = ey_2;
        k[8][2] = -ey_12;
        k[8][4] = ey_6;
        k[8][8] = ey_12;
        k[8][10] = ey_6;
        k[10][2] = -ey_6;
        k[10][4] = ey_2;
        k[10][8] = ey_6;
        k[10][10] = ey_4;

        return k;
    }
}
