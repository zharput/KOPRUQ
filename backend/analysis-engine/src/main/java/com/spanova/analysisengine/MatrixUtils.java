package com.spanova.analysisengine;

/** Small dense-matrix helpers - no external linear-algebra dependency needed at this model size. */
final class MatrixUtils {

    private MatrixUtils() {
    }

    static double[][] multiply(double[][] a, double[][] b) {
        int rows = a.length;
        int inner = b.length;
        int cols = b[0].length;
        double[][] result = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int k = 0; k < inner; k++) {
                double aik = a[i][k];
                if (aik == 0) continue;
                for (int j = 0; j < cols; j++) {
                    result[i][j] += aik * b[k][j];
                }
            }
        }
        return result;
    }

    static double[][] transpose(double[][] a) {
        int rows = a.length;
        int cols = a[0].length;
        double[][] result = new double[cols][rows];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result[j][i] = a[i][j];
            }
        }
        return result;
    }

    /** Global-stiffness contribution of one element: T^T * kLocal * T. */
    static double[][] toGlobal(double[][] kLocal, double[][] t) {
        return multiply(multiply(transpose(t), kLocal), t);
    }

    static double[] multiply(double[][] a, double[] v) {
        int rows = a.length;
        int cols = v.length;
        double[] result = new double[rows];
        for (int i = 0; i < rows; i++) {
            double sum = 0;
            for (int j = 0; j < cols; j++) {
                sum += a[i][j] * v[j];
            }
            result[i] = sum;
        }
        return result;
    }
}
