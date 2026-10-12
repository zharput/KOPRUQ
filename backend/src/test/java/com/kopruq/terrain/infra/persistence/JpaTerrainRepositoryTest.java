package com.kopruq.terrain.infra.persistence;

import com.kopruq.geometry.model.CoordinateSystem;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.terrain.domain.TerrainImportService;
import com.kopruq.terrain.enums.TerrainStatus;
import com.kopruq.terrain.model.TerrainBoundary;
import com.kopruq.terrain.model.TerrainBreakline;
import com.kopruq.terrain.model.TerrainModel;
import com.kopruq.terrain.model.TerrainSource;
import com.kopruq.terrain.model.TerrainTriangle;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Round trips of {@link JpaTerrainRepository} against the configured test database (H2 PostgreSQL mode by default). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(JpaTerrainRepository.class)
class JpaTerrainRepositoryTest {

    @Autowired
    JpaTerrainRepository repository;
    @Autowired
    EntityManager em;
    @Autowired
    JdbcTemplate jdbc;

    private TerrainModel saveAndReload(TerrainModel terrain) {
        repository.save(terrain);
        em.flush();
        em.clear(); // force a real read from the database
        return repository.findById(terrain.id()).orElseThrow();
    }

    private static String newId() {
        return UUID.randomUUID().toString();
    }

    @Test
    void landXmlTerrain_withSourceBoundariesAndBreaklines_roundTripsEqual() throws IOException {
        TerrainModel base;
        try (InputStream in = getClass().getResourceAsStream("/landxml/sample.landxml")) {
            base = new LandXmlImportService().commit(in, "p1", "sample.landxml", "Local", "Existing Ground", null,
                    CoordinateOrder.FIRST_Y_SECOND_X).terrain();
        }
        assertNotNull(base.source(), "the LandXML terrain carries its import diagnostics");
        TerrainModel terrain = new TerrainModel(newId(), base.projectId(), base.coordinateSystem(), base.sourceType(),
                base.sourceFileName(), base.boundsMin(), base.boundsMax(), base.minElevationM(), base.maxElevationM(),
                base.vertices(), base.triangles(), base.localOrigin(), base.version(), base.status(),
                List.of(new TerrainBoundary("outer", "OUTER", true, List.of(new Point3D(0, 0, 2), new Point3D(10, 0, 5), new Point3D(10, 10, 10))),
                        new TerrainBoundary("hole", "VOID", false, List.of())),
                List.of(new TerrainBreakline("ridge", List.of(new Point3D(0, 0, 2), new Point3D(10, 10, 10))),
                        new TerrainBreakline(null, List.of(new Point3D(1, 1, 1)))),
                base.source());

        TerrainModel loaded = saveAndReload(terrain);

        assertEquals(terrain, loaded);
        assertEquals(2, loaded.boundaries().size());
        assertEquals("hole", loaded.boundaries().get(1).name());
        assertEquals(base.source(), loaded.source());
    }

    @Test
    void xyzTerrain_withoutSource_roundTripsEqual_andSourceStaysNull() {
        TerrainModel terrain = new TerrainImportService()
                .importXyz("p-xyz", "points.xyz", "local", "0 0 1\n10 0 2\n0 10 3\n10 10 4\n");
        assertNull(terrain.source());

        TerrainModel loaded = saveAndReload(terrain);

        assertEquals(terrain, loaded);
        assertNull(loaded.source());
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_source where terrain_id = ?", Integer.class, terrain.id()));
    }

    @Test
    void vertexAndTriangleData_isBitForBitIdentical() {
        // (-0.0 is only used inside the vertex blob: scalar DOUBLE columns are not guaranteed to keep the sign of zero)
        List<Point3D> vertices = List.of(new Point3D(0.1, 0.2, 0.30000000000000004), new Point3D(-0.0, 1e-320, -1e300),
                new Point3D(123456789.123456789, 987654321.987654321, 3.141592653589793));
        TerrainModel terrain = new TerrainModel(newId(), "p", new CoordinateSystem("32635", "UTM"), "XYZ", "f.xyz",
                new Point3D(0.0, 0.2, -1e300), new Point3D(1, 2, 3), -1e300, 3, vertices,
                List.of(new TerrainTriangle(0, 1, 2)), new Point3D(0, 0, 0), 7, TerrainStatus.VALID);

        TerrainModel loaded = saveAndReload(terrain);

        assertEquals(terrain, loaded);
        for (int i = 0; i < vertices.size(); i++) {
            assertEquals(Double.doubleToRawLongBits(vertices.get(i).x()), Double.doubleToRawLongBits(loaded.vertices().get(i).x()));
            assertEquals(Double.doubleToRawLongBits(vertices.get(i).y()), Double.doubleToRawLongBits(loaded.vertices().get(i).y()));
            assertEquals(Double.doubleToRawLongBits(vertices.get(i).z()), Double.doubleToRawLongBits(loaded.vertices().get(i).z()));
        }
        assertEquals(7, loaded.version());
        assertEquals(TerrainStatus.VALID, loaded.status());
        assertEquals("32635", loaded.coordinateSystem().epsgCode());
    }

    @Test
    void emptyMesh_withInfiniteBounds_andNullCoordinateSystem_roundTrips() {
        double inf = Double.POSITIVE_INFINITY;
        TerrainModel terrain = new TerrainModel(newId(), "p", null, null, null,
                new Point3D(inf, inf, inf), new Point3D(-inf, -inf, -inf), inf, -inf,
                List.of(), List.of(), new Point3D(inf, inf, inf), 1, TerrainStatus.REVIEW_REQUIRED);

        TerrainModel loaded = saveAndReload(terrain);

        assertEquals(terrain, loaded);
        assertNull(loaded.coordinateSystem());
        assertTrue(loaded.vertices().isEmpty());
        assertEquals(inf, loaded.boundsMin().x());
    }

    @Test
    void coordinateSystemWithNullParts_isDistinctFromNoCoordinateSystem() {
        TerrainModel terrain = new TerrainModel(newId(), "p", new CoordinateSystem(null, null), null, null,
                new Point3D(0, 0, 0), new Point3D(1, 1, 1), 0, 1, List.of(), List.of(), new Point3D(0, 0, 0), 1,
                TerrainStatus.IMPORTED);
        assertEquals(new CoordinateSystem(null, null), saveAndReload(terrain).coordinateSystem());
    }

    @Test
    void saveAgain_updatesInPlace_includingChildRows() throws IOException {
        TerrainModel first = new TerrainModel(newId(), "p", new CoordinateSystem("1", "a"), "LANDXML", "a.xml",
                new Point3D(0, 0, 0), new Point3D(1, 1, 1), 0, 1,
                List.of(new Point3D(0, 0, 0), new Point3D(1, 0, 0), new Point3D(0, 1, 1)),
                List.of(new TerrainTriangle(0, 1, 2)), new Point3D(0, 0, 0), 1, TerrainStatus.IMPORTED,
                List.of(new TerrainBoundary("b1", "OUTER", false, List.of(new Point3D(0, 0, 0)))),
                List.of(new TerrainBreakline("l1", List.of(new Point3D(0, 0, 0)))),
                new TerrainSource("app", "1.2", "meter", "s", "NE", 3, 1, 0, 0, 0, 0, 0));
        saveAndReload(first);

        TerrainModel second = new TerrainModel(first.id(), "p2", null, "XYZ", "b.xyz",
                new Point3D(0, 0, 0), new Point3D(2, 2, 2), 0, 2,
                List.of(new Point3D(0, 0, 0), new Point3D(2, 0, 0), new Point3D(0, 2, 2), new Point3D(2, 2, 2)),
                List.of(new TerrainTriangle(0, 1, 2), new TerrainTriangle(1, 3, 2)), new Point3D(0, 0, 0), 2,
                TerrainStatus.VALID, List.of(), List.of(), null);

        TerrainModel loaded = saveAndReload(second);

        assertEquals(second, loaded);
        assertEquals(1, jdbc.queryForObject("select count(*) from terrain where id = ?", Integer.class, first.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_boundary where terrain_id = ?", Integer.class, first.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_source where terrain_id = ?", Integer.class, first.id()));
    }

    @Test
    void deleteById_removesTheTerrainAndItsChildren_andUnknownIdIsANoOp() {
        TerrainModel terrain = new TerrainModel(newId(), "p", null, null, null, new Point3D(0, 0, 0), new Point3D(1, 1, 1),
                0, 1, List.of(new Point3D(0, 0, 0)), List.of(), new Point3D(0, 0, 0), 1, TerrainStatus.IMPORTED,
                List.of(new TerrainBoundary("b", "OUTER", true, List.of(new Point3D(0, 0, 0)))),
                List.of(new TerrainBreakline("l", List.of(new Point3D(0, 0, 0)))),
                new TerrainSource(null, null, null, null, null, 1, 0, 0, 0, 0, 0, 0));
        saveAndReload(terrain);

        repository.deleteById(terrain.id());
        em.flush();
        em.clear();

        assertTrue(repository.findById(terrain.id()).isEmpty());
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_boundary where terrain_id = ?", Integer.class, terrain.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_breakline where terrain_id = ?", Integer.class, terrain.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from terrain_source where terrain_id = ?", Integer.class, terrain.id()));
        repository.deleteById("never-existed");
        assertTrue(repository.findById("never-existed").isEmpty());
    }

    @Test
    void corruptStoredBlob_isReportedAsAnIntegrityError_onRead() {
        TerrainModel terrain = new TerrainModel(newId(), "p", null, null, null, new Point3D(0, 0, 0), new Point3D(1, 1, 1),
                0, 1, List.of(new Point3D(0, 0, 0), new Point3D(1, 0, 0), new Point3D(0, 1, 0)),
                List.of(new TerrainTriangle(0, 1, 2)), new Point3D(0, 0, 0), 1, TerrainStatus.IMPORTED);
        saveAndReload(terrain);

        jdbc.update("update terrain set vertices = ? where id = ?", new byte[10], terrain.id());
        em.clear();

        assertThrows(IllegalStateException.class, () -> repository.findById(terrain.id()));
    }
}
