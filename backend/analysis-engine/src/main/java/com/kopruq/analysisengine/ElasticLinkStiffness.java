package com.kopruq.analysisengine;

/**
 * 12x12 stiffness matrix for a 2-node elastic-link element, acting along
 * GLOBAL axes directly (see {@link com.kopruq.analysis.ElasticLinkElement}'s
 * javadoc for why no local-axis rotation is applied) - six independent
 * springs (kx, ky, kz, krx, kry, krz), each coupling the matching DOF at
 * node I and node J the standard way a 2-node spring does.
 */
final class ElasticLinkStiffness {

    private ElasticLinkStiffness() {
    }

    static double[][] global(double kx, double ky, double kz, double krx, double kry, double krz) {
        double[] k = {kx, ky, kz, krx, kry, krz};
        double[][] matrix = new double[12][12];
        for (int d = 0; d < 6; d++) {
            int i = d;
            int j = d + 6;
            matrix[i][i] = k[d];
            matrix[j][j] = k[d];
            matrix[i][j] = -k[d];
            matrix[j][i] = -k[d];
        }
        return matrix;
    }
}
