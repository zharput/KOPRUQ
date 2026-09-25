package com.kopruq.api.terrain;

import com.kopruq.landxml.*;
import com.kopruq.terrain.*;
import com.kopruq.spatialcore.Point3D;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.geom.prep.PreparedGeometryFactory;
import java.nio.file.*;
import java.util.*;
import javax.xml.stream.*;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in production regression: no source changes and no network/solver calls. */
class BentleyProductionTerrainTest {
    @Test
    @EnabledIfSystemProperty(named="kopruq.terrain.production", matches=".+")
    void fullBentleyTinMatchesSourcePointsFacesAndElevationSamples() throws Exception {
        Path path=Path.of(System.getProperty("kopruq.terrain.production"));
        long started=System.nanoTime();
        LandXmlImportResult imported;
        try(var input=Files.newInputStream(path)) {
            imported=new LandXmlImportService().commit(input,"production-check",path.getFileName().toString(),
                    "Local / Unknown","2222-SP-2_DTM-MaCen_Sterio70_Rev-O1",null,CoordinateOrder.FIRST_Y_SECOND_X);
        }
        TerrainModel terrain=imported.terrain();
        assertEquals(603004,terrain.vertices().size());assertEquals(1087885,terrain.triangles().size());
        assertEquals(1,terrain.boundaries().stream().filter(b -> "OUTER".equals(b.type())).count());
        assertEquals(4,terrain.boundaries().stream().filter(b -> "VOID".equals(b.type())).count());
        assertEquals(24262,terrain.breaklines().size());
        assertEquals(0,terrain.source().duplicatePointIds());assertEquals(0,terrain.source().invalidFaces());
        assertEquals(0,terrain.source().invalidPoints());assertEquals(0,terrain.source().missingPointReferences());
        // Independent second pass checks every tuple and every face against the canonical output.
        var factory=XMLInputFactory.newInstance();factory.setProperty(XMLInputFactory.SUPPORT_DTD,false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES,false);
        Map<String,Integer> ids=new HashMap<>();
        int pointCount=0,faceCount=0;boolean points=false,faces=false;
        try(var input=Files.newInputStream(path)) {
            var xml=factory.createXMLStreamReader(input);
            while(xml.hasNext()) {
                int event=xml.next();String name=xml.hasName()?xml.getLocalName():"";
                if(event==XMLStreamConstants.START_ELEMENT) {
                    if(name.equals("Pnts")) points=true;
                    else if(name.equals("Faces")) faces=true;
                    else if(points && name.equals("P")) {
                        String id=xml.getAttributeValue(null,"id");String[] values=xml.getElementText().trim().split("\\s+");
                        var p=terrain.vertices().get(pointCount);assertEquals(Double.parseDouble(values[1]),p.x());
                        assertEquals(Double.parseDouble(values[0]),p.y());assertEquals(Double.parseDouble(values[2]),p.z());
                        ids.put(id,pointCount++);
                    } else if(faces && name.equals("F")) {
                        String[] values=xml.getElementText().trim().split("\\s+");var face=terrain.triangles().get(faceCount++);
                        assertEquals(ids.get(values[0]).intValue(),face.a());assertEquals(ids.get(values[1]).intValue(),face.b());assertEquals(ids.get(values[2]).intValue(),face.c());
                    }
                } else if(event==XMLStreamConstants.END_ELEMENT) {
                    if(name.equals("Pnts")) points=false;else if(name.equals("Faces")) faces=false;
                }
            }
            xml.close();
        }
        assertEquals(terrain.vertices().size(),pointCount);assertEquals(terrain.triangles().size(),faceCount);
        var query=new TerrainQueryService();
        for(int index : new int[]{0,terrain.triangles().size()/2,terrain.triangles().size()-1}) {
            var face=terrain.triangles().get(index);var a=terrain.vertices().get(face.a());var b=terrain.vertices().get(face.b());var c=terrain.vertices().get(face.c());
            assertEquals((a.z()+b.z()+c.z())/3,query.getElevation(terrain,(a.x()+b.x()+c.x())/3,(a.y()+b.y()+c.y())/3).orElseThrow(),1e-6);
        }
        var geomFactory=new GeometryFactory();
        for(var boundary:terrain.boundaries()) {
            if(!boundary.type().equals("VOID")) continue;
            var coordinates=new ArrayList<Coordinate>();
            for(Point3D p:boundary.points()) coordinates.add(new Coordinate(p.x(),p.y()));
            if(!coordinates.getFirst().equals2D(coordinates.getLast())) coordinates.add(coordinates.getFirst());
            var polygon=geomFactory.createPolygon(coordinates.toArray(Coordinate[]::new));
            assertTrue(polygon.isValid(),"Source void polygon must be valid for this diagnostic");
            var prepared=PreparedGeometryFactory.prepare(polygon);long inside=0;
            for(var face:terrain.triangles()) {
                var a=terrain.vertices().get(face.a());var b=terrain.vertices().get(face.b());var c=terrain.vertices().get(face.c());
                double x=(a.x()+b.x()+c.x())/3,y=(a.y()+b.y()+c.y())/3;
                if(polygon.getEnvelopeInternal().contains(x,y) && prepared.contains(geomFactory.createPoint(new Coordinate(x,y)))) inside++;
            }
            System.out.println("VOID_CENTROID_DIAGNOSTIC " + boundary.name()+" trianglesInside="+inside);
        }
        var counter=new java.io.OutputStream(){long count;@Override public void write(int value){count++;}
            @Override public void write(byte[] bytes,int offset,int length){count+=length;}};
        TerrainBinaryWriter.write(terrain,counter);
        assertEquals(40L+12L*(pointCount+faceCount),counter.count);
        System.out.println("BENTLEY_PRODUCTION points="+pointCount+" faces="+faceCount+" binaryBytes="+counter.count
                +" boundsMin="+terrain.boundsMin()+" boundsMax="+terrain.boundsMax()+" diagnostics="+terrain.source()
                +" seconds="+(System.nanoTime()-started)/1e9);
    }
}
