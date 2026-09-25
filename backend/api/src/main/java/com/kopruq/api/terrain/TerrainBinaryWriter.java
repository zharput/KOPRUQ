package com.kopruq.api.terrain;
import com.kopruq.terrain.TerrainModel;
import java.io.*;
import java.nio.*;

/** Version 1: LE magic/version/counts/origin (40 bytes), Float32 XYZ-local positions, UInt32 indices. */
public final class TerrainBinaryWriter {
    public static final int MAGIC = 0x53504e54;
    private TerrainBinaryWriter() { }
    public static void write(TerrainModel terrain, OutputStream output) throws IOException {
        ByteBuffer b = ByteBuffer.allocate(65536).order(ByteOrder.LITTLE_ENDIAN);
        b.putInt(MAGIC).putInt(1).putInt(terrain.vertices().size()).putInt(terrain.triangles().size());
        var origin = terrain.localOrigin();
        b.putDouble(origin.x()).putDouble(origin.y()).putDouble(origin.z());
        for (var p : terrain.vertices()) {
            if (b.remaining()<12) flush(b,output);
            b.putFloat((float)(p.x()-origin.x())).putFloat((float)(p.y()-origin.y())).putFloat((float)(p.z()-origin.z()));
        }
        for (var f : terrain.triangles()) {
            if (b.remaining()<12) flush(b,output);
            b.putInt(f.a()).putInt(f.b()).putInt(f.c());
        }
        flush(b,output);
    }
    private static void flush(ByteBuffer b, OutputStream out) throws IOException {
        out.write(b.array(),0,b.position()); b.clear();
    }
}
