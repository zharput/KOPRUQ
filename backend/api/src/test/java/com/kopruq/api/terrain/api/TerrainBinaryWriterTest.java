package com.kopruq.api.terrain;
import com.kopruq.terrain.*;
import com.kopruq.spatialcore.*;
import java.util.*;
import java.nio.*;
import java.io.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class TerrainBinaryWriterTest {
    @Test void localCoordinatesAndLargeIndicesRoundTripWithoutLosingEngineeringPrecision() throws Exception {
        var points=new ArrayList<Point3D>();
        for(int i=0;i<70000;i++) points.add(new Point3D(442156.460+i,460725.719,402.963013));
        var origin=points.getFirst();
        var terrain=new TerrainModel("id","p",new CoordinateSystem(null,"unknown"),"test","test",origin,
                points.getLast(),origin.z(),origin.z(),points,List.of(new TerrainTriangle(0,65536,69999)),origin,1,TerrainStatus.IMPORTED);
        var out=new ByteArrayOutputStream();TerrainBinaryWriter.write(terrain,out);
        var bytes=ByteBuffer.wrap(out.toByteArray()).order(ByteOrder.LITTLE_ENDIAN);
        assertEquals(TerrainBinaryWriter.MAGIC,bytes.getInt());assertEquals(1,bytes.getInt());
        assertEquals(70000,bytes.getInt());assertEquals(1,bytes.getInt());
        assertEquals(origin.x(),bytes.getDouble());assertEquals(origin.y(),bytes.getDouble());assertEquals(origin.z(),bytes.getDouble());
        assertEquals(0,bytes.getFloat());assertEquals(0,bytes.getFloat());assertEquals(0,bytes.getFloat());
        bytes.position(40+69999*12);assertEquals(points.getLast().x(),origin.x()+bytes.getFloat(),1e-6);
        bytes.position(40+70000*12);assertEquals(0,bytes.getInt());assertEquals(65536,bytes.getInt());assertEquals(69999,bytes.getInt());
        assertEquals(442156.460,terrain.vertices().getFirst().x());
    }
}
