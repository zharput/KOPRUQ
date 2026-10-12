package com.kopruq.terrain.infra.persistence;

import com.kopruq.geometry.model.Point3D;
import com.kopruq.terrain.model.TerrainTriangle;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

/**
 * Binary encoding of TIN geometry for the {@code bytea} columns of the terrain tables.
 *
 * <p>FORMAT (fixed; changing it requires a Flyway migration plus a converter):
 * <ul>
 *   <li>points: 24 bytes each = x, y, z as little-endian IEEE-754 doubles (metres, SI);</li>
 *   <li>triangles: 12 bytes each = a, b, c as little-endian 32-bit signed ints (vertex indices).</li>
 * </ul>
 * Doubles are stored bit for bit (NaN and +/-Infinity included). The element count is stored in a separate column
 * and is checked on decoding: a length that does not match, or a triangle index outside {@code 0..vertexCount-1},
 * is a data-integrity error ({@link IllegalStateException}); nothing is silently truncated or repaired.
 */
public final class TinBinaryCodec {

    public static final int POINT_STRIDE_BYTES = 3 * Double.BYTES;
    public static final int TRIANGLE_STRIDE_BYTES = 3 * Integer.BYTES;

    private TinBinaryCodec() {
    }

    public static byte[] encodePoints(List<Point3D> points) {
        ByteBuffer buffer = ByteBuffer.allocate(Math.multiplyExact(points.size(), POINT_STRIDE_BYTES))
                .order(ByteOrder.LITTLE_ENDIAN);
        for (Point3D p : points) {
            buffer.putDouble(p.x()).putDouble(p.y()).putDouble(p.z());
        }
        return buffer.array();
    }

    public static List<Point3D> decodePoints(byte[] bytes, int count, String what) {
        requireLength(bytes, count, POINT_STRIDE_BYTES, what);
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        List<Point3D> points = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            points.add(new Point3D(buffer.getDouble(), buffer.getDouble(), buffer.getDouble()));
        }
        return points;
    }

    public static byte[] encodeTriangles(List<TerrainTriangle> triangles) {
        ByteBuffer buffer = ByteBuffer.allocate(Math.multiplyExact(triangles.size(), TRIANGLE_STRIDE_BYTES))
                .order(ByteOrder.LITTLE_ENDIAN);
        for (TerrainTriangle t : triangles) {
            buffer.putInt(t.a()).putInt(t.b()).putInt(t.c());
        }
        return buffer.array();
    }

    public static List<TerrainTriangle> decodeTriangles(byte[] bytes, int count, int vertexCount, String what) {
        requireLength(bytes, count, TRIANGLE_STRIDE_BYTES, what);
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        List<TerrainTriangle> triangles = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            int a = buffer.getInt();
            int b = buffer.getInt();
            int c = buffer.getInt();
            requireIndex(a, vertexCount, what, i);
            requireIndex(b, vertexCount, what, i);
            requireIndex(c, vertexCount, what, i);
            triangles.add(new TerrainTriangle(a, b, c));
        }
        return triangles;
    }

    private static void requireLength(byte[] bytes, int count, int stride, String what) {
        if (bytes == null) {
            throw new IllegalStateException("Stored " + what + " data is missing");
        }
        if (count < 0 || (long) count * stride != bytes.length) {
            throw new IllegalStateException("Stored " + what + " data has " + bytes.length + " bytes but "
                    + count + " elements x " + stride + " bytes were expected");
        }
    }

    private static void requireIndex(int index, int vertexCount, String what, int triangle) {
        if (index < 0 || index >= vertexCount) {
            throw new IllegalStateException("Stored " + what + " triangle #" + triangle + " references vertex "
                    + index + " outside 0.." + (vertexCount - 1));
        }
    }
}
