package com.kopruq.landxml.application;

import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.application.TerrainRepository;
import com.kopruq.terrain.model.TerrainModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionOperations;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Real database, real transaction: when the second write of a LandXML import fails, the terrain written first is
 * rolled back, even when the compensating delete cannot help (here it is deliberately a no-op).
 */
@SpringBootTest
class LandXmlImportTransactionTest {

    @Autowired
    TerrainRepository terrains;
    @Autowired
    LandXmlImportRepository imports;
    @Autowired
    TransactionOperations transactions;
    @Autowired
    JdbcTemplate jdbc;

    private LandXmlImportResult run(LandXmlImportUseCase useCase) throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/landxml/sample.landxml")) {
            return useCase.importLandXml(in, "p1", "sample.landxml", "Local", "Existing Ground", "Main Alignment",
                    CoordinateOrder.FIRST_Y_SECOND_X);
        }
    }

    private int terrainCount() {
        return jdbc.queryForObject("select count(*) from terrain", Integer.class);
    }

    private LandXmlImportRepository failingImports() {
        return new LandXmlImportRepository() {
            @Override
            public LandXmlImportResult save(LandXmlImportResult result) {
                throw new IllegalStateException("second write failed");
            }

            @Override
            public Optional<LandXmlImportResult> findById(String id) {
                return Optional.empty();
            }
        };
    }

    @Test
    void failureOfTheSecondWrite_rollsTheTerrainBack_evenWithoutACompensatingDelete() throws Exception {
        int before = terrainCount();
        List<String> savedIds = new ArrayList<>();
        TerrainRepository noCompensation = new TerrainRepository() {
            @Override
            public TerrainModel save(TerrainModel terrain) {
                savedIds.add(terrain.id());
                return terrains.save(terrain);
            }

            @Override
            public Optional<TerrainModel> findById(String id) {
                return terrains.findById(id);
            }

            @Override
            public void deleteById(String id) {
                // intentionally nothing: only the transaction rollback may remove the terrain
            }
        };
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), noCompensation, failingImports(), transactions);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> run(useCase));

        assertEquals("second write failed", e.getMessage());
        assertEquals(1, savedIds.size(), "the terrain write did happen before the failure");
        assertEquals(before, terrainCount(), "no orphan terrain may remain");
        assertTrue(terrains.findById(savedIds.get(0)).isEmpty());
    }

    @Test
    void success_commitsBothWrites() throws Exception {
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), terrains, imports, transactions);

        LandXmlImportResult result = run(useCase);

        assertTrue(terrains.findById(result.terrain().id()).isPresent());
        assertTrue(imports.findById(result.id()).isPresent());
    }
}
