package com.kopruq.landxml.infra.persistence;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.CurveElement;
import com.kopruq.alignment.model.Pvi;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.alignment.model.VerticalProfile;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.application.TerrainRepository;
import com.kopruq.terrain.infra.persistence.JpaTerrainRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaLandXmlImportRepository.class, JpaTerrainRepository.class})
class JpaLandXmlImportRepositoryTest {

    @Autowired
    JpaLandXmlImportRepository imports;
    @Autowired
    LandXmlImportJpaRepository jpa;
    @Autowired
    TerrainRepository terrains;
    @Autowired
    EntityManager em;
    @Autowired
    org.springframework.jdbc.core.JdbcTemplate jdbc;

    private static LandXmlImportResult importSample(String alignmentName) throws IOException {
        try (InputStream in = JpaLandXmlImportRepositoryTest.class.getResourceAsStream("/landxml/sample.landxml")) {
            return new LandXmlImportService().commit(in, "p1", "sample.landxml", "Local", "Existing Ground",
                    alignmentName, CoordinateOrder.FIRST_Y_SECOND_X);
        }
    }

    private LandXmlImportResult saveAndReload(LandXmlImportResult result) {
        terrains.save(result.terrain());
        imports.save(result);
        em.flush();
        em.clear();
        return imports.findById(result.id()).orElseThrow();
    }

    private static void assertSameImport(LandXmlImportResult expected, LandXmlImportResult actual) {
        assertEquals(expected.id(), actual.id());
        assertEquals(expected.terrain(), actual.terrain());
        assertEquals(expected.warnings(), actual.warnings());
        assertEquals(expected.profile(), actual.profile());
        if (expected.alignment() == null) {
            assertNull(actual.alignment());
        } else {
            assertEquals(expected.alignment().elements(), actual.alignment().elements());
            assertEquals(expected.alignment().totalLengthM(), actual.alignment().totalLengthM(), 0);
        }
    }

    @Test
    void importWithAlignmentAndProfile_roundTripsStraightAndCurveElements() throws IOException {
        LandXmlImportResult result = importSample("Main Alignment");
        assertNotNull(result.alignment());
        assertNotNull(result.profile());
        assertTrue(result.alignment().elements().stream().anyMatch(e -> e instanceof StraightElement));
        assertTrue(result.alignment().elements().stream().anyMatch(e -> e instanceof CurveElement));
        assertFalse(result.warnings().isEmpty());

        LandXmlImportResult loaded = saveAndReload(result);

        assertSameImport(result, loaded);
        assertEquals("Design Profile", loaded.profile().name());
        CurveElement curve = (CurveElement) loaded.alignment().elements().stream()
                .filter(e -> e instanceof CurveElement).findFirst().orElseThrow();
        assertEquals(false, curve.clockwise()); // rot="ccw" in the fixture
        assertEquals(50.0, curve.radiusM(), 0);
    }

    @Test
    void clockwiseCurve_andPviDetails_roundTrip() {
        Alignment alignment = new Alignment(List.of(
                new StraightElement(new Point3D(0, 0, 1), new Point3D(0, 100, 2)),
                new CurveElement(new Point3D(0, 100, 0), new Point3D(50, 150, 0), new Point3D(50, 100, 0), 50, true)));
        VerticalProfile profile = new VerticalProfile("P", List.of(new Pvi(0, 100, 0), new Pvi(100, 105, 40), new Pvi(200, 100, 0)));
        var terrain = new com.kopruq.terrain.model.TerrainModel(UUID.randomUUID().toString(), "p", null, null, null,
                new Point3D(0, 0, 0), new Point3D(1, 1, 1), 0, 1, List.of(), List.of(), new Point3D(0, 0, 0), 1,
                com.kopruq.terrain.enums.TerrainStatus.IMPORTED);
        LandXmlImportResult result = new LandXmlImportResult(UUID.randomUUID().toString(), terrain, alignment, profile,
                List.of("w1", "w2"));

        LandXmlImportResult loaded = saveAndReload(result);

        assertSameImport(result, loaded);
        assertTrue(((CurveElement) loaded.alignment().elements().get(1)).clockwise());
        assertEquals(List.of("w1", "w2"), loaded.warnings());
        assertEquals(40.0, loaded.profile().pvis().get(1).curveLengthM(), 0);
    }

    @Test
    void importWithoutAlignment_readsBackWithNullAlignmentAndProfile() throws IOException {
        LandXmlImportResult result = importSample(null);
        assertNull(result.alignment());
        assertNull(result.profile());

        LandXmlImportResult loaded = saveAndReload(result);

        assertNull(loaded.alignment());
        assertNull(loaded.profile());
        assertSameImport(result, loaded);
    }

    @Test
    void unknownId_isEmpty() {
        assertTrue(imports.findById("never-existed").isEmpty());
    }

    @Test
    void missingTerrain_isAnIntegrityError_onRead() throws IOException {
        LandXmlImportResult result = importSample(null);
        terrains.save(result.terrain());
        imports.save(result);
        em.flush();
        em.clear();
        // the same stored import read through a terrain port that no longer knows the terrain
        TerrainRepository terrainsWithoutIt = new TerrainRepository() {
            @Override
            public com.kopruq.terrain.model.TerrainModel save(com.kopruq.terrain.model.TerrainModel terrain) {
                throw new UnsupportedOperationException();
            }

            @Override
            public java.util.Optional<com.kopruq.terrain.model.TerrainModel> findById(String id) {
                return java.util.Optional.empty();
            }

            @Override
            public void deleteById(String id) {
                throw new UnsupportedOperationException();
            }
        };
        JpaLandXmlImportRepository broken = new JpaLandXmlImportRepository(jpa, terrainsWithoutIt);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> broken.findById(result.id()));
        assertTrue(e.getMessage().contains(result.terrain().id()));
    }

    @Test
    void theTerrainReferencedByAnImport_cannotBeDeleted() throws IOException {
        LandXmlImportResult result = importSample(null);
        terrains.save(result.terrain());
        imports.save(result);
        em.flush();

        assertThrows(RuntimeException.class, () -> terrains.deleteById(result.terrain().id()));
    }

    @Test
    void findTerrainId_findIdsByTerrainId_andDeleteById() throws IOException {
        LandXmlImportResult result = importSample("Main Alignment");
        saveAndReload(result);
        String terrainId = result.terrain().id();

        assertEquals(java.util.Optional.of(terrainId), imports.findTerrainId(result.id()));
        assertEquals(java.util.Optional.empty(), imports.findTerrainId("unknown"));
        assertEquals(List.of(result.id()), imports.findIdsByTerrainId(terrainId));
        assertEquals(List.of(), imports.findIdsByTerrainId("unknown"));

        imports.deleteById(result.id());
        em.flush();
        em.clear();

        assertTrue(imports.findById(result.id()).isEmpty());
        assertEquals(List.of(), imports.findIdsByTerrainId(terrainId));
        assertEquals(0, jdbc.queryForObject("select count(*) from landxml_alignment_element where import_id = ?",
                Integer.class, result.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from landxml_import_warning where import_id = ?",
                Integer.class, result.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from landxml_profile_pvi where import_id = ?",
                Integer.class, result.id()));
        imports.deleteById(result.id()); // unknown id is a no-op
    }
}
