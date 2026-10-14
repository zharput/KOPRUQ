package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.model.GraphConnection;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.GraphGroup;
import com.kopruq.bridge.model.GraphNode;
import com.kopruq.bridge.model.GraphNodeParameter;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberValue;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.SeismicInputsSection;
import com.kopruq.bridge.model.SelfWeightInputsSection;
import com.kopruq.bridge.model.TemperatureInputsSection;
import com.kopruq.bridge.model.TrafficLm1Section;
import com.kopruq.bridge.model.WindInputsSection;
import com.kopruq.bridge.model.WindSnapshotResult;
import com.kopruq.bridge.model.WindSnapshotSection;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static com.kopruq.bridge.DesignSystemFixtures.crossSection;
import static com.kopruq.bridge.DesignSystemFixtures.pierFamilies;
import static com.kopruq.bridge.LoadGraphFixtures.emptyGraph;
import static com.kopruq.bridge.LoadGraphFixtures.graph;
import static com.kopruq.bridge.LoadGraphFixtures.seismic;
import static com.kopruq.bridge.LoadGraphFixtures.selfWeight;
import static com.kopruq.bridge.LoadGraphFixtures.temperature;
import static com.kopruq.bridge.LoadGraphFixtures.trafficLm1;
import static com.kopruq.bridge.LoadGraphFixtures.wind;
import static com.kopruq.bridge.LoadGraphFixtures.windSnapshot;
import static com.kopruq.bridge.LoadGraphFixtures.windSnapshotInvalidResult;
import static com.kopruq.bridge.LoadGraphFixtures.windSnapshotWithoutStatus;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** The M3 sections through the real adapter on the migrated test database (Flyway + {@code ddl-auto=validate}). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaProjectRepository.class, JpaProjectContentRepository.class, DesignSystemContentStore.class,
        LoadInputContentStore.class, GraphContentStore.class})
class JpaLoadGraphContentTest {

    @Autowired
    JpaProjectRepository projects;
    @Autowired
    JpaProjectContentRepository contents;
    @Autowired
    EntityManager em;
    @Autowired
    JdbcTemplate jdbc;

    private UUID newProject() {
        Project project = new Project();
        project.setProjectName("p");
        projects.save(project);
        return project.getId();
    }

    private ProjectContent replaceAndReload(UUID id, ProjectSection section) {
        contents.replace(id, section);
        em.flush();
        em.clear();
        return contents.load(id);
    }

    private int count(String table, UUID id) {
        return jdbc.queryForObject("select count(*) from " + table + " where project_id = ?", Integer.class, id);
    }

    private int graphChildCount(String table, String fk, String parent, UUID id) {
        return jdbc.queryForObject("select count(*) from " + table + " c join " + parent + " p on p.id = c." + fk
                + " where p.project_id = ?", Integer.class, id);
    }

    private int graphGrandchildCount(String table, String fk, String parent, String parentFk, UUID id) {
        return jdbc.queryForObject("select count(*) from " + table + " c join " + parent + " p on p.id = c." + fk
                + " join graph_document d on d.id = p." + parentFk + " where d.project_id = ?", Integer.class, id);
    }

    private int itemCount(UUID id) {
        return jdbc.queryForObject("select count(*) from graph_node_parameter_item i "
                + "join graph_node_parameter p on p.id = i.graph_node_parameter_id "
                + "join graph_node n on n.id = p.graph_node_id "
                + "join graph_document d on d.id = n.graph_document_id where d.project_id = ?", Integer.class, id);
    }

    private int groupMemberCount(UUID id) {
        return jdbc.queryForObject("select count(*) from graph_group_node m "
                + "join graph_group g on g.id = m.graph_group_id "
                + "join graph_document d on d.id = g.graph_document_id where d.project_id = ?", Integer.class, id);
    }

    private static Object stored(ProjectContent c, ProjectSection section) {
        return switch (section) {
            case SeismicInputsSection s -> new SeismicInputsSection(c.loads().seismic());
            case WindInputsSection s -> new WindInputsSection(c.loads().wind());
            case TemperatureInputsSection s -> new TemperatureInputsSection(c.loads().temperature());
            case SelfWeightInputsSection s -> new SelfWeightInputsSection(c.loads().selfWeight());
            case TrafficLm1Section s -> new TrafficLm1Section(c.loads().trafficLm1());
            case WindSnapshotSection s -> new WindSnapshotSection(c.loads().windSnapshot());
            default -> throw new IllegalArgumentException();
        };
    }

    static Stream<ProjectSection> loadSections() {
        return Stream.of(seismic(), wind(), temperature(), selfWeight(), trafficLm1(), windSnapshot(),
                windSnapshotWithoutStatus(), windSnapshotInvalidResult());
    }

    @ParameterizedTest
    @MethodSource("loadSections")
    void loadSection_roundTripsEqual(ProjectSection section) {
        UUID id = newProject();

        ProjectContent loaded = replaceAndReload(id, section);

        assertEquals(section, stored(loaded, section));
    }

    @Test
    void projectWithNothingStored_loadsEveryLoadNull_andNoGraphs() {
        UUID id = newProject();

        ProjectContent c = contents.load(id);

        assertNull(c.loads().seismic());
        assertNull(c.loads().wind());
        assertNull(c.loads().temperature());
        assertNull(c.loads().selfWeight());
        assertNull(c.loads().trafficLm1());
        assertNull(c.loads().windSnapshot());
        assertEquals(List.of(), c.graphs());
    }

    @Test
    void clearingALoadSection_removesItsRows_andLeavesTheOthers() {
        UUID id = newProject();
        replaceAndReload(id, seismic());
        replaceAndReload(id, wind());
        replaceAndReload(id, trafficLm1());
        assertEquals(3, count("load_traffic_lm1_factor", id));

        ProjectContent afterClear = replaceAndReload(id, new SeismicInputsSection(null));
        replaceAndReload(id, new TrafficLm1Section(null));
        ProjectContent last = contents.load(id);

        assertNull(afterClear.loads().seismic());
        assertNotNull(afterClear.loads().wind());
        assertEquals(0, count("load_seismic_input", id));
        assertEquals(0, count("load_traffic_lm1_factor", id));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_section_presence where project_id = ? "
                + "and section_key = 'TRAFFIC_LM1'", Integer.class, id));
        assertNull(last.loads().trafficLm1());
        assertEquals(wind().inputs(), last.loads().wind());
    }

    @Test
    void trafficLm1_storesOneRemainingAreaRow_andRewritesWithoutUniqueViolations() {
        UUID id = newProject();
        replaceAndReload(id, trafficLm1());
        assertEquals(1, jdbc.queryForObject("select count(*) from load_traffic_lm1_factor where project_id = ? "
                + "and factor_group = 'REMAINING_AREA_UDL'", Integer.class, id));
        assertEquals(2, jdbc.queryForObject("select count(*) from load_traffic_lm1_factor where project_id = ? "
                + "and factor_group = 'TANDEM_SYSTEM'", Integer.class, id));

        ProjectContent again = replaceAndReload(id, trafficLm1());

        assertEquals(trafficLm1().inputs(), again.loads().trafficLm1());
        assertEquals(3, count("load_traffic_lm1_factor", id));
    }

    @Test
    void trafficLm1_withoutItsRemainingAreaRow_isCorruptData() {
        UUID id = newProject();
        replaceAndReload(id, trafficLm1());
        jdbc.update("delete from load_traffic_lm1_factor where project_id = ? and factor_group = 'REMAINING_AREA_UDL'",
                id);
        em.clear();

        assertThrows(IllegalStateException.class, () -> contents.load(id));
    }

    private static final List<String> RESULT_NUMBER_COLUMNS = List.of("result_z0_m", "result_zmin_m", "result_kr",
            "result_cr", "result_vm_m_s", "result_turbulence_intensity", "result_qp_kn_m2", "result_b_over_d",
            "result_cfx", "result_transverse_kn_m");

    @Test
    void windSnapshot_hasTypedResultColumns() {
        List<java.util.Map<String, Object>> rows = jdbc.queryForList("select lower(column_name) as name, "
                + "lower(data_type) as type, upper(is_nullable) as nullable from information_schema.columns "
                + "where lower(table_name) = 'load_wind_snapshot' and lower(column_name) like 'result\\_%' escape '\\'");

        java.util.Map<String, String> types = new java.util.HashMap<>();
        java.util.Map<String, String> nullable = new java.util.HashMap<>();
        for (java.util.Map<String, Object> r : rows) {
            types.put((String) r.get("name"), (String) r.get("type"));
            nullable.put((String) r.get("name"), (String) r.get("nullable"));
        }

        assertEquals(13, rows.size());
        assertEquals("boolean", types.get("result_present"));
        assertEquals("NO", nullable.get("result_present"));
        assertEquals("character varying", types.get("result_status"));
        assertEquals("character varying", types.get("result_missing"));
        for (String column : RESULT_NUMBER_COLUMNS) {
            assertEquals("double precision", types.get(column), column);
        }
        for (String column : types.keySet()) {
            if (!column.equals("result_present")) {
                assertEquals("YES", nullable.get(column), column);
            }
        }
    }

    private java.util.Map<String, Object> windRow(UUID id) {
        return jdbc.queryForMap("select * from load_wind_snapshot where project_id = ?", id);
    }

    private boolean allResultColumnsNull(java.util.Map<String, Object> row) {
        return row.entrySet().stream().filter(e -> e.getKey().toLowerCase().startsWith("result_")
                && !e.getKey().equalsIgnoreCase("result_present")).allMatch(e -> e.getValue() == null);
    }

    @Test
    void windSnapshot_replaceWithAndWithoutResult() {
        UUID id = newProject();

        ProjectContent first = replaceAndReload(id, windSnapshot());
        assertEquals(windSnapshot().snapshot(), first.loads().windSnapshot());
        assertEquals(Boolean.TRUE, windRow(id).get("RESULT_PRESENT"));

        ProjectContent second = replaceAndReload(id, windSnapshotWithoutStatus());
        assertNull(second.loads().windSnapshot().result());
        assertEquals(Boolean.FALSE, windRow(id).get("RESULT_PRESENT"));
        assertEquals(true, allResultColumnsNull(windRow(id)));

        ProjectContent third = replaceAndReload(id, windSnapshotInvalidResult());
        assertEquals(windSnapshotInvalidResult().snapshot(), third.loads().windSnapshot());
        assertEquals(Boolean.TRUE, windRow(id).get("RESULT_PRESENT"));
        assertNull(windRow(id).get("RESULT_TRANSVERSE_KN_M"));

        ProjectContent fourth = replaceAndReload(id, windSnapshot());
        assertEquals(windSnapshot().snapshot(), fourth.loads().windSnapshot());
        assertEquals(1, count("load_wind_snapshot", id));
    }

    @Test
    void windSnapshot_numbersAreBitIdentical() {
        UUID id = newProject();
        WindSnapshotResult expected = windSnapshot().snapshot().result();

        WindSnapshotResult actual = replaceAndReload(id, windSnapshot()).loads().windSnapshot().result();

        assertEquals(Double.doubleToRawLongBits(expected.cr()), Double.doubleToRawLongBits(actual.cr()));
        assertEquals(Double.doubleToRawLongBits(expected.qpKNm2()), Double.doubleToRawLongBits(actual.qpKNm2()));
        assertEquals(Double.doubleToRawLongBits(expected.turbulenceIntensity()),
                Double.doubleToRawLongBits(actual.turbulenceIntensity()));
        assertEquals(Double.MAX_VALUE, actual.qpKNm2());
        assertEquals(1.0E-300, actual.turbulenceIntensity());
        assertEquals(expected, actual);
    }

    @Test
    void windSnapshot_presentWithNullRequiredColumn_isCorruptData() {
        UUID id = newProject();
        replaceAndReload(id, windSnapshot());
        jdbc.update("update load_wind_snapshot set result_kr = null where project_id = ?", id);
        em.clear();

        assertThrows(IllegalStateException.class, () -> contents.load(id));
    }

    @Test
    void windSnapshot_absentWithResultColumn_isCorruptData() {
        UUID id = newProject();
        replaceAndReload(id, windSnapshotWithoutStatus());
        jdbc.update("update load_wind_snapshot set result_cfx = 1.3 where project_id = ?", id);
        em.clear();

        assertThrows(IllegalStateException.class, () -> contents.load(id));
    }

    // ------------------------------------------------------------------ graphs

    @Test
    void graph_roundTripsEqual_withAllParameterKinds() {
        UUID id = newProject();
        GraphDocument g = graph("g-1");

        ProjectContent loaded = replaceAndReload(id, g);

        assertEquals(List.of(g), loaded.graphs());
    }

    @Test
    void graph_nullGroupsAndEmptyGroupsAreDifferent_ownerIdsMayBeNull() {
        UUID id = newProject();
        replaceAndReload(id, emptyGraph("a", null));
        ProjectContent loaded = replaceAndReload(id, emptyGraph("b", List.of()));

        assertNull(loaded.graphs().get(0).groups());
        assertEquals(List.of(), loaded.graphs().get(1).groups());
        assertNull(loaded.graphs().get(0).projectId());
        assertNull(loaded.graphs().get(0).bridgeId());
    }

    @Test
    void graphs_keepCreationOrder_andAnUpsertKeepsThePosition() {
        UUID id = newProject();
        replaceAndReload(id, emptyGraph("a", null));
        replaceAndReload(id, emptyGraph("b", null));
        replaceAndReload(id, emptyGraph("c", null));

        GraphDocument newB = new GraphDocument("b", "renamed", 1, "P", null, List.of(), List.of(), List.of());
        ProjectContent loaded = replaceAndReload(id, newB);

        assertEquals(List.of("a", "b", "c"), loaded.graphs().stream().map(GraphDocument::id).toList());
        assertEquals(newB, loaded.graphs().get(1));
        assertEquals(emptyGraph("a", null), loaded.graphs().get(0));
        assertEquals(emptyGraph("c", null), loaded.graphs().get(2));
    }

    @Test
    void graphUpsert_deletesRemovedChildRows_andAllowsReorderedSameIds() {
        UUID id = newProject();
        replaceAndReload(id, graph("g-1"));
        assertEquals(2, graphChildCount("graph_node", "graph_document_id", "graph_document", id));
        assertEquals(6, graphGrandchildCount("graph_node_parameter", "graph_node_id", "graph_node",
                "graph_document_id", id));
        assertEquals(1, graphChildCount("graph_connection", "graph_document_id", "graph_document", id));
        assertEquals(2, graphChildCount("graph_group", "graph_document_id", "graph_document", id));
        assertEquals(4, itemCount(id));

        GraphDocument original = graph("g-1");
        GraphNode a = original.nodes().get(0);
        GraphNode b = original.nodes().get(1);
        GraphDocument reordered = new GraphDocument("g-1", "n", 1, null, null, List.of(b, a),
                List.of(new GraphConnection("e-1", "n-2", "x", "n-1", "y")), List.of());
        ProjectContent loaded = replaceAndReload(id, reordered);
        assertEquals(List.of(reordered), loaded.graphs());

        GraphNode small = new GraphNode("n-1", "t", "n", 0.0, 0.0,
                List.of(new GraphNodeParameter("only", new GraphNumberValue(1))));
        ProjectContent shrunk = replaceAndReload(id, new GraphDocument("g-1", "n", 1, null, null,
                List.of(small), List.of(), null));

        assertEquals(1, shrunk.graphs().size());
        assertEquals(1, graphChildCount("graph_node", "graph_document_id", "graph_document", id));
        assertEquals(1, graphGrandchildCount("graph_node_parameter", "graph_node_id", "graph_node",
                "graph_document_id", id));
        assertEquals(0, itemCount(id));
        assertEquals(0, graphChildCount("graph_connection", "graph_document_id", "graph_document", id));
        assertEquals(0, graphChildCount("graph_group", "graph_document_id", "graph_document", id));
        assertEquals(1, count("graph_document", id));
    }

    @Test
    void graphGroupMembers_areRemovedWithTheirGroups() {
        UUID id = newProject();
        replaceAndReload(id, graph("g-1"));
        assertEquals(2, groupMemberCount(id));

        replaceAndReload(id, emptyGraph("g-1", null));

        assertEquals(0, groupMemberCount(id));
    }

    @Test
    void graphs_ofDifferentProjects_areIndependent() {
        UUID one = newProject();
        UUID two = newProject();
        replaceAndReload(one, emptyGraph("same", null));
        ProjectContent loadedTwo = replaceAndReload(two, graph("same"));

        assertEquals(List.of(graph("same")), loadedTwo.graphs());
        assertEquals(List.of(emptyGraph("same", null)), contents.load(one).graphs());
    }

    @Test
    void loadSectionsAndGraphs_doNotDisturbWorkspaceOrDesignSections_andViceVersa() {
        UUID id = newProject();
        replaceAndReload(id, pierFamilies());
        replaceAndReload(id, crossSection());
        contents.replace(id, workspace("p", row("a")));
        replaceAndReload(id, seismic());
        replaceAndReload(id, graph("g-1"));

        ProjectContent c = replaceAndReload(id, pierFamilies());

        assertEquals(pierFamilies(), c.pierFamilies());
        assertEquals(crossSection().values(), c.crossSection());
        assertNotNull(c.workspace());
        assertEquals(seismic().inputs(), c.loads().seismic());
        assertEquals(List.of(graph("g-1")), c.graphs());
    }
}
