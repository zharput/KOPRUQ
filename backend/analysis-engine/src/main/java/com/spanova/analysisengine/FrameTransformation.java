package com.spanova.analysisengine;

/**
 * Local-to-global axis transformation for a 3D frame element - the
 * standard "reference vector" method (e.g. McGuire/Gallagher/Ziemian
 * section 4.3): local x runs along the member; a reference vector not
 * parallel to local x fixes the local y/z orientation (no member has a
 * user-specified roll/rotation angle in this engine yet - not needed for
 * this milestone's plumb columns / level deck / horizontal cap beams).
 *
 * <p>Reference vector: global Z (0,0,1) for any non-vertical member, so
 * local z ends up close to "vertical" and local y "horizontal" for a
 * horizontal or inclined member (matches this project's convention:
 * {@code SolidRectangleSection.heightM()} = local-z dimension). Global X
 * (1,0,0) is used instead for a vertical member, where global Z can't
 * serve as a reference (parallel to local x).
 */
final class FrameTransformation {

    private static final double VERTICAL_TOLERANCE = 1e-9;

    private FrameTransformation() {
    }

    /** 3x3 direction-cosine matrix: rows are the local x/y/z axes expressed in global coordinates. */
    static double[][] rotationMatrix(double xi, double yi, double zi, double xj, double yj, double zj) {
        Vector3 localX = Vector3.between(xi, yi, zi, xj, yj, zj).normalized();

        boolean vertical = Math.abs(localX.x()) < VERTICAL_TOLERANCE && Math.abs(localX.y()) < VERTICAL_TOLERANCE;
        Vector3 reference = vertical ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);

        Vector3 localY = reference.cross(localX).normalized();
        Vector3 localZ = localX.cross(localY);

        return new double[][] {
                {localX.x(), localX.y(), localX.z()},
                {localY.x(), localY.y(), localY.z()},
                {localZ.x(), localZ.y(), localZ.z()},
        };
    }

    /** Full 12x12 block-diagonal transformation (4 copies of the 3x3 rotation matrix). */
    static double[][] transformationMatrix12(double[][] rotation3x3) {
        double[][] t = new double[12][12];
        for (int block = 0; block < 4; block++) {
            int offset = block * 3;
            for (int r = 0; r < 3; r++) {
                for (int c = 0; c < 3; c++) {
                    t[offset + r][offset + c] = rotation3x3[r][c];
                }
            }
        }
        return t;
    }
}
