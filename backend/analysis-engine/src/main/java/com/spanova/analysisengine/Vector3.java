package com.spanova.analysisengine;

/** Internal 3D vector helper for the direct-stiffness solver - not part of the public API. */
record Vector3(double x, double y, double z) {

    static Vector3 between(double xi, double yi, double zi, double xj, double yj, double zj) {
        return new Vector3(xj - xi, yj - yi, zj - zi);
    }

    double length() {
        return Math.sqrt(x * x + y * y + z * z);
    }

    Vector3 normalized() {
        double len = length();
        if (len < 1e-12) {
            throw new IllegalArgumentException("Cannot normalize a zero-length vector");
        }
        return new Vector3(x / len, y / len, z / len);
    }

    Vector3 cross(Vector3 other) {
        return new Vector3(
                y * other.z - z * other.y,
                z * other.x - x * other.z,
                x * other.y - y * other.x);
    }
}
