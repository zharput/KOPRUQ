package com.spanova.landxml;

import com.spanova.terrain.*;
import org.junit.jupiter.api.Test;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class BentleyTerrainImportTest {
    private static final String POINTS = "<P id='80'>400000 500000 10</P><P id='2'>400010 500000 20</P><P id='900'>400000 500010 30</P>";
    private static String xml(String points, String faces, String extra) {
        return "<?xml version='1.0' encoding='iso-8859-1'?><LandXML xmlns='http://www.landxml.org/schema/LandXML-1.0' version='1.0'>"
                + "<Units><Metric linearUnit='meter'/></Units><Application name='Bentley Café'/><Surfaces><Surface name='TIN'>"
                + "<SourceData><Boundaries><Boundary name='outside' bndType='outer' edgeTrim='true'><PntList3D>400000 500000 10 400010 500000 20 400000 500010 30</PntList3D>"
                + "<P id='wrong'>0 0 0</P></Boundary><Boundary name='hole' bndType='void'><PntList3D>400001 500001 10 400002 500001 10 400001 500002 10</PntList3D></Boundary></Boundaries>"
                + "<Breaklines><Breakline name='ridge'><PntList3D>400000 500000 10 400010 500000 20</PntList3D></Breakline></Breaklines></SourceData>"
                + "<Definition surfType='TIN'><Pnts>"+points+"</Pnts><Faces>"+faces+"</Faces></Definition></Surface>"+extra+"</Surfaces></LandXML>";
    }
    private static ByteArrayInputStream input(String xml) {
        return new ByteArrayInputStream(xml.replace("\\u00e9", "\u00e9").getBytes(StandardCharsets.ISO_8859_1));
    }
    private static TerrainModel commit(String xml, CoordinateOrder order) {
        return new LandXmlImportService().commit(input(xml),"p","bentley.xml","Local / Unknown","TIN",null,order).terrain();
    }
    @Test void namespaceEncodingHierarchyAndSupportingDefinitionsArePreserved() {
        var doc=new LandXmlParser().parse(input(xml(POINTS,"<F>900 80 2</F>","")));
        assertEquals("1.0",doc.formatVersion()); assertEquals("Bentley Café",doc.application());
        var surface=doc.surfaces().getFirst(); assertEquals(3,surface.points().size());
        assertEquals(2,surface.boundaries().size()); assertTrue(surface.boundaries().getFirst().edgeTrim());
        assertEquals("VOID",surface.boundaries().get(1).type()); assertEquals(1,surface.breaklines().size());
        assertEquals(2,surface.breaklines().getFirst().points().size());
    }
    @Test void sparseIdsPreserveFaceOrderAndBothExplicitCoordinateMappings() {
        var xml=xml(POINTS,"<F>900 80 2</F>","");
        var terrain=commit(xml,CoordinateOrder.FIRST_X_SECOND_Y);
        assertEquals(new TerrainTriangle(2,0,1),terrain.triangles().getFirst());
        assertEquals(400000,terrain.vertices().getFirst().x()); assertEquals(500000,terrain.vertices().getFirst().y());
        assertEquals(500000,commit(xml,CoordinateOrder.FIRST_Y_SECOND_X).vertices().getFirst().x());
        assertEquals(20,new TerrainQueryService().getElevation(terrain,400000+10.0/3,500000+10.0/3).orElseThrow(),1e-7);
        assertEquals(TerrainStatus.REVIEW_REQUIRED,terrain.status());
    }
    @Test void invalidReferencesMalformedAndDegenerateFacesAreCounted() {
        var terrain=commit(xml(POINTS,"<F>80 2 900</F><F>80 2 missing</F><F>80 80 80</F><F>80 2</F>",""),CoordinateOrder.FIRST_X_SECOND_Y);
        assertEquals(2,terrain.triangles().size()); assertEquals(4,terrain.source().sourceFaceCount());
        assertEquals(2,terrain.source().invalidFaces()); assertEquals(1,terrain.source().missingPointReferences());
        assertEquals(1,terrain.source().degenerateFaces());
    }
    @Test void duplicateIdsNeverSilentlyResolveAmbiguousFaces() {
        var terrain=commit(xml(POINTS+"<P id='80'>9 9 9</P>","<F>80 2 900</F><F>2 900 2</F>",""),CoordinateOrder.FIRST_X_SECOND_Y);
        assertEquals(1,terrain.source().duplicatePointIds()); assertEquals(1,terrain.source().invalidFaces());
    }
    @Test void missingTopologyAndNonMetricUnitsAreRejected() {
        assertTrue(assertThrows(IllegalArgumentException.class,() -> commit(xml(POINTS,"",""),CoordinateOrder.FIRST_X_SECOND_Y)).getMessage().contains("TIN_TOPOLOGY_MISSING"));
        assertTrue(assertThrows(IllegalArgumentException.class,() -> commit(xml(POINTS,"<F>80 2 900</F>","").replace("linearUnit='meter'","linearUnit='foot'"),CoordinateOrder.FIRST_X_SECOND_Y)).getMessage().contains("UNSUPPORTED_UNITS"));
    }
    @Test void selectedSurfaceOnlyAndForeignNamespaces() {
        String other="<Surface name='other'><Definition><Pnts><P id='1'>0 0 0</P></Pnts></Definition></Surface>";
        String text=xml(POINTS,"<F>80 2 900</F>",other).replace("<Pnts>","<Pnts><P xmlns='urn:foreign' id='bad'>0 0 0</P>");
        assertEquals(2,new LandXmlParser().parse(input(text)).surfaces().size());
        assertEquals(1,new LandXmlParser().parse(input(text),"TIN").surfaces().size());
        assertEquals(3,commit(text,CoordinateOrder.FIRST_X_SECOND_Y).vertices().size());
        assertThrows(LandXmlParseException.class,() -> new LandXmlParser().parse(input(text.replace("http://www.landxml.org/schema/LandXML-1.0","urn:wrong"))));
    }
    @Test void nonFinitePointsAreReported() {
        var terrain=commit(xml(POINTS+"<P id='bad'>NaN 2 3</P>","<F>80 2 900</F>",""),CoordinateOrder.FIRST_X_SECOND_Y);
        assertEquals(1,terrain.source().invalidPoints());assertEquals(4,terrain.source().sourcePointCount());
    }
}
