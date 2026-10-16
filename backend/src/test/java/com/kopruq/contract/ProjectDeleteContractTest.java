package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.application.ProjectRepository;
import com.kopruq.bridge.application.ProjectService;
import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.bridge.model.Girder;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.kopruq.bridge.DesignSystemFixtures.bearingFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.bridgeDefinitions;
import static com.kopruq.bridge.DesignSystemFixtures.crossSection;
import static com.kopruq.bridge.DesignSystemFixtures.foundationFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.girderLibrary;
import static com.kopruq.bridge.DesignSystemFixtures.materialAssignments;
import static com.kopruq.bridge.DesignSystemFixtures.pierCapFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.pierFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.preferredSpanRules;
import static com.kopruq.bridge.LoadGraphFixtures.graph;
import static com.kopruq.bridge.LoadGraphFixtures.seismic;
import static com.kopruq.bridge.LoadGraphFixtures.selfWeight;
import static com.kopruq.bridge.LoadGraphFixtures.temperature;
import static com.kopruq.bridge.LoadGraphFixtures.trafficLm1;
import static com.kopruq.bridge.LoadGraphFixtures.wind;
import static com.kopruq.bridge.LoadGraphFixtures.windSnapshot;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static com.kopruq.bridge.WorkspaceFixtures.workspaceWithEnvironment;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * e2e-test-data-cleanup: {@code DELETE /api/projects/{projectId}}. The test database is shared and committed by the
 * contract tests, so every test looks only at the projects, terrains and imports it created itself.
 */
class ProjectDeleteContractTest extends ContractTestSupport {

    private static final List<String> TERRAIN_TABLES = List.of("terrain", "terrain_source", "terrain_boundary",
            "terrain_breakline");
    private static final List<String> IMPORT_TABLES = List.of("landxml_import", "landxml_import_warning",
            "landxml_alignment_element", "landxml_profile_pvi");

    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    ProjectService service;
    @Autowired
    ProjectRepository projects;

    // ------------------------------------------------------------------ helpers

    private MvcResult delete(Object projectId) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.delete("/api/projects/" + projectId)).andReturn();
    }

    private UUID projectWithEnvironment(String name, String terrainId, String importId) {
        return service.create(workspaceWithEnvironment(name, terrainId, importId)).projectId();
    }

    /** A project with every section this API can store plus the bridge/design-space/alternatives aggregate. */
    private UUID fullProject(String name) {
        UUID id = service.create(workspace(name, row("a"), row("b"))).projectId();
        long revision = 0;
        List<ProjectSection> sections = List.of(bridgeDefinitions(), pierFamilies(), pierCapFamilies(),
                foundationFamilies(), bearingFamilies(), materialAssignments(), girderLibrary(), preferredSpanRules(),
                crossSection(), seismic(), wind(), temperature(), selfWeight(), trafficLm1(), windSnapshot(),
                graph("g-1"), graph("g-2"));
        for (ProjectSection section : sections) {
            service.replace(id, revision++, section);
        }
        Project project = projects.findById(id).orElseThrow();
        BridgeAlternative alt = BridgeAlternative.of(new SpanLayout(List.of(new Span(30), new Span(40))),
                new Girder(5, 1.8, 2.5));
        project.setBridge(new Bridge("VIA", 210, 13.8));
        project.setDesignSpace(new DesignSpace(30, 45, 4, 8, 2, 3, 1.5, 2.5, 0.2, 0.3, 1.0, 2.0, 5, 12, 0.1));
        project.setGeneratedAlternatives(List.of(alt));
        project.setSelectedAlternativeId(alt.id());
        projects.save(project);
        return id;
    }

    private JsonNode importLandXml(String alignmentName) throws Exception {
        MvcResult result = importSample(alignmentName);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return body(result);
    }

    private long countWhere(String table, String column, String value) {
        return jdbc.queryForObject("select count(*) from " + table + " where " + column + " = ?", Long.class, value);
    }

    private long terrainRows(String terrainId) {
        long total = countWhere("terrain", "id", terrainId);
        for (String table : TERRAIN_TABLES.subList(1, TERRAIN_TABLES.size())) {
            total += countWhere(table, "terrain_id", terrainId);
        }
        return total;
    }

    private long importRows(String importId) {
        long total = countWhere("landxml_import", "id", importId);
        for (String table : IMPORT_TABLES.subList(1, IMPORT_TABLES.size())) {
            total += countWhere(table, "import_id", importId);
        }
        return total;
    }

    private void assertProjectExists(UUID id) throws Exception {
        assertEquals(200, get("/api/projects/" + id).getResponse().getStatus());
    }

    // ------------------------------------------------------------------ AC1, AC3

    @Test
    void delete_existingProject_is204WithEmptyBody_thenGoneFromGetAndList() throws Exception {
        UUID id = service.create(workspace("to-delete", row("a"))).projectId();

        MvcResult deleted = delete(id);

        assertEquals(204, deleted.getResponse().getStatus());
        assertEquals("", deleted.getResponse().getContentAsString());
        MvcResult after = get("/api/projects/" + id);
        assertEquals(404, after.getResponse().getStatus());
        assertEquals("PROJECT_NOT_FOUND", body(after).get("code").asText());
        boolean listed = false;
        for (JsonNode summary : getOk("/api/projects")) {
            listed |= summary.get("projectId").asText().equals(id.toString());
        }
        assertTrue(!listed, "deleted project must not be listed");
    }

    @Test
    void delete_unknownId_is404ApiError_andMalformedId_is400() throws Exception {
        MvcResult missing = delete(UUID.randomUUID());
        assertEquals(404, missing.getResponse().getStatus());
        assertEquals("PROJECT_NOT_FOUND", body(missing).get("code").asText());

        MvcResult malformed = delete("abc");
        assertEquals(400, malformed.getResponse().getStatus());
        assertEquals("INVALID_PARAMETER", body(malformed).get("code").asText());
    }

    @Test
    void delete_twice_secondIs404() throws Exception {
        UUID id = service.create(workspace("twice")).projectId();
        assertEquals(204, delete(id).getResponse().getStatus());
        assertEquals(404, delete(id).getResponse().getStatus());
    }

    // ------------------------------------------------------------------ AC2

    /** Every table that has a foreign key to {@code project}, found through the JDBC metadata. */
    private Map<String, String> tablesReferencingProject(Connection c) throws Exception {
        DatabaseMetaData meta = c.getMetaData();
        Map<String, String> tables = new LinkedHashMap<>();
        for (String name : List.of("project", "PROJECT")) {
            try (ResultSet rs = meta.getExportedKeys(null, null, name)) {
                while (rs.next()) {
                    tables.put(rs.getString("FKTABLE_NAME").toLowerCase(), rs.getString("FKCOLUMN_NAME"));
                }
            }
        }
        return tables;
    }

    /** Rows of the table that belong to the project, plus (recursively) the rows of tables that hang below it. */
    private long rowsBelow(Connection c, String table, String where, Object projectId, int depth) throws Exception {
        long total = jdbc.queryForObject("select count(*) from " + table + " where " + where, Long.class, projectId);
        if (depth > 4) {
            return total;
        }
        DatabaseMetaData meta = c.getMetaData();
        List<String[]> children = new ArrayList<>();
        for (String name : List.of(table, table.toUpperCase())) {
            try (ResultSet rs = meta.getExportedKeys(null, null, name)) {
                while (rs.next()) {
                    children.add(new String[] { rs.getString("FKTABLE_NAME").toLowerCase(),
                            rs.getString("FKCOLUMN_NAME"), rs.getString("PKCOLUMN_NAME") });
                }
            }
        }
        for (String[] child : children) {
            String childWhere = child[1] + " in (select " + child[2] + " from " + table + " where " + where + ")";
            total += rowsBelow(c, child[0], childWhere, projectId, depth + 1);
        }
        return total;
    }

    private Map<String, Long> projectRowCounts(Connection c, UUID id) throws Exception {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (var entry : tablesReferencingProject(c).entrySet()) {
            counts.put(entry.getKey(), rowsBelow(c, entry.getKey(), entry.getValue() + " = ?", id, 0));
        }
        return counts;
    }

    @Test
    void delete_removesEveryRowOfTheProject_andLeavesOtherProjectsAlone() throws Exception {
        UUID doomed = fullProject("doomed");
        UUID kept = fullProject("kept");

        try (Connection c = jdbc.getDataSource().getConnection()) {
            Map<String, Long> doomedBefore = projectRowCounts(c, doomed);
            Map<String, Long> keptBefore = projectRowCounts(c, kept);
            assertTrue(doomedBefore.size() >= 22, "tables with a FK to project: " + doomedBefore.keySet());
            assertEquals(doomedBefore, keptBefore, "both projects were filled identically");
            long filled = doomedBefore.values().stream().filter(n -> n > 0).count();
            assertTrue(filled >= 20, "the fixture must fill the tables: " + doomedBefore);

            assertEquals(204, delete(doomed).getResponse().getStatus());

            Map<String, Long> doomedAfter = projectRowCounts(c, doomed);
            doomedAfter.forEach((table, n) -> assertEquals(0L, n, table));
            assertEquals(keptBefore, projectRowCounts(c, kept));
        }
        assertEquals(404, get("/api/projects/" + doomed).getResponse().getStatus());
        assertProjectExists(kept);
    }

    // ------------------------------------------------------------------ AC4 - AC8

    @Test
    void delete_unsharedTerrainAndImport_areRemovedWithTheirChildren() throws Exception {
        JsonNode imp = importLandXml("Main Alignment");
        String terrain = imp.get("terrainId").asText();
        String importId = imp.get("id").asText();
        assertTrue(terrainRows(terrain) > 1 && importRows(importId) > 1, "children must exist before the delete");
        UUID a = projectWithEnvironment("a", terrain, importId);

        assertEquals(204, delete(a).getResponse().getStatus());

        assertEquals(0, terrainRows(terrain));
        assertEquals(0, importRows(importId));
    }

    @Test
    void delete_sharedTerrainAndImport_stayUntilTheLastProjectIsDeleted() throws Exception {
        JsonNode imp = importLandXml("Main Alignment");
        String terrain = imp.get("terrainId").asText();
        String importId = imp.get("id").asText();
        long terrainBefore = terrainRows(terrain);
        long importBefore = importRows(importId);
        UUID a = projectWithEnvironment("a", terrain, importId);
        UUID b = projectWithEnvironment("b", terrain, importId);
        String bBefore = get("/api/projects/" + b).getResponse().getContentAsString();

        assertEquals(204, delete(a).getResponse().getStatus());

        assertEquals(terrainBefore, terrainRows(terrain));
        assertEquals(importBefore, importRows(importId));
        assertEquals(bBefore, get("/api/projects/" + b).getResponse().getContentAsString());

        assertEquals(204, delete(b).getResponse().getStatus());

        assertEquals(0, terrainRows(terrain));
        assertEquals(0, importRows(importId));
    }

    @Test
    void delete_terrainReferencedOnlyThroughAnotherProjectsImport_stays() throws Exception {
        JsonNode imp = importLandXml("Main Alignment");
        String terrain = imp.get("terrainId").asText();
        String importId = imp.get("id").asText();
        UUID a = projectWithEnvironment("a", terrain, null);
        projectWithEnvironment("b", null, importId);

        assertEquals(204, delete(a).getResponse().getStatus());

        assertTrue(terrainRows(terrain) > 0);
        assertTrue(importRows(importId) > 0);
    }

    @Test
    void delete_importWithoutAlignment_isRemovedBeforeItsTerrain() throws Exception {
        JsonNode imp = importLandXml(null);
        String terrain = imp.get("terrainId").asText();
        String orphanImport = imp.get("id").asText();
        UUID a = projectWithEnvironment("a", terrain, null);

        assertEquals(204, delete(a).getResponse().getStatus());

        assertEquals(0, importRows(orphanImport));
        assertEquals(0, terrainRows(terrain));
    }

    @Test
    void delete_danglingEnvironmentReferences_stillReturns204_andTouchesNothingElse() throws Exception {
        JsonNode imp = importLandXml("Main Alignment");
        String terrain = imp.get("terrainId").asText();
        long terrainBefore = terrainRows(terrain);
        UUID a = projectWithEnvironment("a", UUID.randomUUID().toString(), UUID.randomUUID().toString());

        assertEquals(204, delete(a).getResponse().getStatus());

        assertEquals(terrainBefore, terrainRows(terrain));
    }
}
