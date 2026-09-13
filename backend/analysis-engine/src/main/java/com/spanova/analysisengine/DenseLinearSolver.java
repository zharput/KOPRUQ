package com.spanova.analysisengine;

/** Gaussian elimination with partial pivoting - solves A*x = b for a dense, non-singular A. */
final class DenseLinearSolver {

    private DenseLinearSolver() {
    }

    static double[] solve(double[][] a, double[] b) {
        int n = b.length;
        double[][] m = new double[n][n];
        for (int i = 0; i < n; i++) {
            System.arraycopy(a[i], 0, m[i], 0, n);
        }
        double[] rhs = b.clone();

        for (int pivot = 0; pivot < n; pivot++) {
            int maxRow = pivot;
            double maxVal = Math.abs(m[pivot][pivot]);
            for (int r = pivot + 1; r < n; r++) {
                if (Math.abs(m[r][pivot]) > maxVal) {
                    maxVal = Math.abs(m[r][pivot]);
                    maxRow = r;
                }
            }
            if (maxVal < 1e-12) {
                throw new IllegalStateException(
                        "Singular (or near-singular) stiffness matrix at DOF " + pivot +
                                " - the structure is likely unstable/unconstrained (a mechanism).");
            }
            if (maxRow != pivot) {
                double[] tmpRow = m[pivot];
                m[pivot] = m[maxRow];
                m[maxRow] = tmpRow;
                double tmpVal = rhs[pivot];
                rhs[pivot] = rhs[maxRow];
                rhs[maxRow] = tmpVal;
            }

            for (int r = pivot + 1; r < n; r++) {
                double factor = m[r][pivot] / m[pivot][pivot];
                if (factor == 0) continue;
                for (int c = pivot; c < n; c++) {
                    m[r][c] -= factor * m[pivot][c];
                }
                rhs[r] -= factor * rhs[pivot];
            }
        }

        double[] x = new double[n];
        for (int i = n - 1; i >= 0; i--) {
            double sum = rhs[i];
            for (int j = i + 1; j < n; j++) {
                sum -= m[i][j] * x[j];
            }
            x[i] = sum / m[i][i];
        }
        return x;
    }
}
