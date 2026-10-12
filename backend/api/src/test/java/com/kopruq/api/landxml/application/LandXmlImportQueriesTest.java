package com.kopruq.api.landxml.application;

import com.kopruq.landxml.CoordinateOrder;
import com.kopruq.landxml.InMemoryLandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportResult;
import com.kopruq.landxml.LandXmlImportService;
import com.kopruq.terrain.InMemoryTerrainRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LandXmlImportQueriesTest {

    @Test
    void findsACommittedImport_andIsEmptyForAnUnknownId() {
        var imports = new InMemoryLandXmlImportRepository();
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), new InMemoryTerrainRepository(), imports);
        LandXmlImportResult result = useCase.importLandXml(
                LandXmlImportQueriesTest.class.getResourceAsStream("/landxml/sample.landxml"), "p1", "sample.landxml",
                "Local", "Existing Ground", "Main Alignment", CoordinateOrder.FIRST_Y_SECOND_X);

        var queries = new LandXmlImportQueries(imports);

        assertSame(result, queries.findById(result.id()).orElseThrow());
        assertTrue(queries.findById("no-such-import").isEmpty());
    }
}
