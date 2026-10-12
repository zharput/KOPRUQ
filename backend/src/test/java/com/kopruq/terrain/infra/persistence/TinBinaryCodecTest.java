package com.kopruq.terrain.infra.persistence;

import com.kopruq.geometry.model.Point3D;
import com.kopruq.terrain.model.TerrainTriangle;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TinBinaryCodecTest {

    @Test
    void points_roundTripBitForBit_includingNaNInfinityAndNegativeZero() {
        List<Point3D> points = List.of(
                new Point3D(1.5, -2.25, 1e300),
                new Point3D(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY),
                new Point3D(-0.0, Double.MIN_VALUE, Math.PI));

        byte[] bytes = TinBinaryCodec.encodePoints(points);

        assertEquals(3 * TinBinaryCodec.POINT_STRIDE_BYTES, bytes.length);
        List<Point3D> decoded = TinBinaryCodec.decodePoints(bytes, 3, "test");
        assertEquals(points, decoded);
        assertEquals(Double.doubleToRawLongBits(-0.0), Double.doubleToRawLongBits(decoded.get(2).x()));
        assertArrayEquals(bytes, TinBinaryCodec.encodePoints(decoded));
    }

    @Test
    void pointFormat_isLittleEndianDoubles() {
        byte[] bytes = TinBinaryCodec.encodePoints(List.of(new Point3D(1.0, 0.0, 0.0)));
        // 1.0 = 0x3FF0000000000000 -> little-endian: 00 00 00 00 00 00 F0 3F
        assertEquals((byte) 0xF0, bytes[6]);
        assertEquals((byte) 0x3F, bytes[7]);
        assertEquals(0, bytes[0]);
    }

    @Test
    void triangles_roundTrip_andEmptyMesh() {
        List<TerrainTriangle> triangles = List.of(new TerrainTriangle(0, 1, 2), new TerrainTriangle(2, 1, 3));
        byte[] bytes = TinBinaryCodec.encodeTriangles(triangles);
        assertEquals(2 * TinBinaryCodec.TRIANGLE_STRIDE_BYTES, bytes.length);
        assertEquals(triangles, TinBinaryCodec.decodeTriangles(bytes, 2, 4, "test"));

        assertEquals(0, TinBinaryCodec.encodePoints(List.of()).length);
        assertEquals(List.of(), TinBinaryCodec.decodePoints(new byte[0], 0, "test"));
        assertEquals(List.of(), TinBinaryCodec.decodeTriangles(new byte[0], 0, 0, "test"));
    }

    @Test
    void lengthMismatch_isAnIntegrityError_notSilentlyTruncated() {
        byte[] bytes = TinBinaryCodec.encodePoints(List.of(new Point3D(1, 2, 3), new Point3D(4, 5, 6)));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodePoints(bytes, 1, "test"));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodePoints(bytes, 3, "test"));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodePoints(bytes, -1, "test"));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodePoints(null, 0, "test"));
        byte[] odd = new byte[TinBinaryCodec.POINT_STRIDE_BYTES + 1];
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodePoints(odd, 1, "test"));

        byte[] tri = TinBinaryCodec.encodeTriangles(List.of(new TerrainTriangle(0, 1, 2)));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodeTriangles(tri, 2, 3, "test"));
    }

    @Test
    void triangleIndexOutsideTheVertexRange_isAnIntegrityError() {
        byte[] tooHigh = TinBinaryCodec.encodeTriangles(List.of(new TerrainTriangle(0, 1, 3)));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodeTriangles(tooHigh, 1, 3, "test"));
        byte[] negative = TinBinaryCodec.encodeTriangles(List.of(new TerrainTriangle(-1, 1, 2)));
        assertThrows(IllegalStateException.class, () -> TinBinaryCodec.decodeTriangles(negative, 1, 3, "test"));
        // the same triangle is fine when the vertex count covers it
        assertEquals(1, TinBinaryCodec.decodeTriangles(tooHigh, 1, 4, "test").size());
    }
}
