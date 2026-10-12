package com.kopruq.api.landxml.application;

import com.kopruq.landxml.CoordinateOrder;
import com.kopruq.landxml.InMemoryLandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportResult;
import com.kopruq.landxml.LandXmlImportService;
import com.kopruq.landxml.LandXmlParseException;
import com.kopruq.terrain.InMemoryTerrainRepository;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 10: the two repository writes of a LandXML import are all-or-nothing. */
class LandXmlImportUseCaseTest {

    private static InputStream sample() {
        InputStream stream = LandXmlImportUseCaseTest.class.getResourceAsStream("/landxml/sample.landxml");
        if (stream == null) {
            throw new IllegalStateException("landxml/sample.landxml fixture missing");
        }
        return stream;
    }

    private static LandXmlImportResult run(LandXmlImportUseCase useCase) {
        return useCase.importLandXml(sample(), "p1", "sample.landxml", "Local", "Existing Ground", "Main Alignment",
                CoordinateOrder.FIRST_Y_SECOND_X);
    }

    @Test
    void success_storesTheTerrainAndTheImport() {
        var terrains = new InMemoryTerrainRepository();
        var imports = new InMemoryLandXmlImportRepository();
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), terrains, imports);

        LandXmlImportResult result = run(useCase);

        assertSame(result.terrain(), terrains.findById(result.terrain().id()).orElseThrow());
        assertSame(result, imports.findById(result.id()).orElseThrow());
    }

    @Test
    void failureWhileStoringTheImport_removesTheTerrainAgain_andRethrowsTheOriginalFailure() {
        var terrains = new InMemoryTerrainRepository();
        var broken = new LandXmlImportRepository() {
            @Override
            public LandXmlImportResult save(LandXmlImportResult result) {
                throw new IllegalStateException("second write failed");
            }

            @Override
            public Optional<LandXmlImportResult> findById(String id) {
                return Optional.empty();
            }
        };
        List<String> savedTerrainIds = new ArrayList<>();
        var recordingTerrains = new com.kopruq.terrain.TerrainRepository() {
            @Override
            public com.kopruq.terrain.TerrainModel save(com.kopruq.terrain.TerrainModel terrain) {
                savedTerrainIds.add(terrain.id());
                return terrains.save(terrain);
            }

            @Override
            public Optional<com.kopruq.terrain.TerrainModel> findById(String id) {
                return terrains.findById(id);
            }

            @Override
            public void deleteById(String id) {
                terrains.deleteById(id);
            }
        };
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), recordingTerrains, broken);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> run(useCase));

        assertEquals("second write failed", e.getMessage());
        assertEquals(1, savedTerrainIds.size(), "the terrain had been stored before the second write failed");
        assertTrue(terrains.findById(savedTerrainIds.get(0)).isEmpty(), "the orphan terrain must have been removed");
    }

    @Test
    void failureOfTheImportItself_storesNothing() {
        var terrains = new InMemoryTerrainRepository();
        var imports = new InMemoryLandXmlImportRepository();
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), terrains, imports);

        assertThrows(LandXmlParseException.class, () -> useCase.importLandXml(
                new ByteArrayInputStream("<notxml".getBytes()), "p1", "bad.landxml", "Local", "S", null,
                CoordinateOrder.FIRST_Y_SECOND_X));
        // nothing to look up by id, but the repositories were never touched: a fresh import still works
        assertEquals("Existing Ground", run(useCase).terrain().source().surfaceName());
    }

    @Test
    void deleteById_isAnInternalOperationOfTheInMemoryRepository() {
        var terrains = new InMemoryTerrainRepository();
        var imports = new InMemoryLandXmlImportRepository();
        LandXmlImportResult result = run(new LandXmlImportUseCase(new LandXmlImportService(), terrains, imports));
        terrains.deleteById(result.terrain().id());
        terrains.deleteById("never-existed"); // deleting an unknown id is a no-op
        assertTrue(terrains.findById(result.terrain().id()).isEmpty());
    }
}
