package com.kopruq.contract;

import com.fasterxml.jackson.core.JsonPointer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * backend-db-persistence M3: the six load-input {@code PUT} endpoints, the graph upsert endpoint and the new document
 * fields. The test database is shared and committed by the contract tests, so every test looks only at the projects
 * it created itself. The numbers and texts are arbitrary test data, not engineering data.
 */
class ProjectLoadGraphApiContractTest extends ContractTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    // ------------------------------------------------------------------ section fixtures (all fields explicit)

    private static final String SEISMIC = """
            {"a":"0.4","g":"Z","t":"Tip ş","i":""}""";

    private static final String WIND = """
            {"vb":"27","terrain":"II","ze":"abc"}""";

    private static final String TEMPERATURE = """
            {"min":"-17","max":"","t0":"10°"}""";

    private static final String SELF_WEIGHT = """
            {"asphaltThicknessM":0.1,"asphaltUnitWeightKNm3":-24.0,"sidewalkThicknessM":0.30000000000000004,
             "sidewalkUnitWeightKNm3":0.0,"faciaCount":2.0,"faciaWidthM":0.7,"faciaThicknessM":0.08,
             "faciaUnitWeightKNm3":25.0,"guardrailCount":2.0,"guardrailUnitLoadKNm":2.0,"pedestrianRailingCount":2.0,
             "pedestrianRailingUnitLoadKNm":1.5,"protectiveFenceCount":2.0,"protectiveFenceUnitLoadKNm":1.0,
             "soundPanelCount":1.0,"soundPanelUnitLoadKNm":1.0}""";

    private static final String TRAFFIC_LM1 = """
            {"tandemSystem":[
              {"label":"Q1k","characteristicValue":{"value":300.0,"provenance":"CODE_DEFAULT","codeDefaultValue":300.0},
               "adjustmentFactor":{"value":0.9,"provenance":"PROJECT_OVERRIDE","codeDefaultValue":1.0}},
              {"label":"Q1k","characteristicValue":{"value":-1.0,"provenance":"NATIONAL_ANNEX","codeDefaultValue":null},
               "adjustmentFactor":{"value":0.0,"provenance":"CODE_DEFAULT","codeDefaultValue":null}}],
             "udl":[],
             "remainingAreaUdl":{"label":"qrk",
               "characteristicValue":{"value":null,"provenance":"NATIONAL_ANNEX","codeDefaultValue":null},
               "adjustmentFactor":{"value":1.0,"provenance":"CODE_DEFAULT","codeDefaultValue":1.0}}}""";

    private static final String WIND_SNAPSHOT = """
            {"schemaVersion":1,"status":"VALID",
             "inputs":{"vb":"27","terrain":"II","ze":"10","deckWidthM":13.8,"drefM":3.0},
             "result":{"status":"VALID","z0M":0.05,"zminM":2.0,"kr":0.19,"cr":0.30000000000000004,
                       "vmMs":-1.5,"turbulenceIntensity":0.0,"qpKNm2":1.0E-300,"bOverD":4.6,"cfx":1.3,
                       "transverseKNm":2.5,"missing":null}}""";

    private static final String WIND_SNAPSHOT_INVALID = """
            {"schemaVersion":1,"status":"INVALID",
             "inputs":{"vb":"27","terrain":"II","ze":"10","deckWidthM":13.8,"drefM":3.0},
             "result":{"status":"INVALID","z0M":0.0,"zminM":0.0,"kr":0.0,"cr":0.0,
                       "vmMs":0.0,"turbulenceIntensity":0.0,"qpKNm2":0.0,"bOverD":0.0,"cfx":1.3,
                       "transverseKNm":null,"missing":"some text ç"}}""";

    private static final List<String> WIND_RESULT_KEYS = List.of("status", "z0M", "zminM", "kr", "cr", "vmMs",
            "turbulenceIntensity", "qpKNm2", "bOverD", "cfx", "transverseKNm", "missing");

    private static final String GRAPH = """
            {"id":"GID","name":"Bridge B-1","schemaVersion":1,"projectId":"P-2026","bridgeId":"b-1",
             "nodes":[
               {"id":"n-1","type":"input.number","name":"Number ç","position":{"x":0.30000000000000004,"y":-12.5},
                "parameters":[{"key":"value","kind":"NUMBER","value":5.0},
                              {"key":"enabled","kind":"BOOLEAN","value":false},
                              {"key":"unit","kind":"STRING","value":""},
                              {"key":"list","kind":"NUMBER_ARRAY","value":[1.0,2.5]},
                              {"key":"none","kind":"NUMBER_ARRAY","value":[]},
                              {"key":"","kind":"STRING","value":"empty key"}]},
               {"id":"n-2","type":"not.in.registry","name":"","position":{"x":100.0,"y":0.0},"parameters":[]}],
             "connections":[{"id":"e-1","sourceNodeId":"n-1","sourcePortId":"value","targetNodeId":"n-2",
                             "targetPortId":"no-such-port"}],
             "groups":[{"id":"group-001","name":"Group 1","nodeIds":["n-1","n-2"],"color":"#5C7C99"},
                       {"id":"group-001","name":"same id again","nodeIds":[],"color":""}]}""";

    private static String graph(String id) {
        return GRAPH.replace("GID", id);
    }

    /** A section: endpoint path, where it appears in the project document (JSON pointer) and a valid value. */
    record Section(String name, String path, String pointer, String value, boolean clearable) {
        @Override
        public String toString() {
            return name;
        }
    }

    private static final Section[] LOADS = {
            new Section("seismic", "/loads/seismic", "/loads/seismic", SEISMIC, true),
            new Section("wind", "/loads/wind", "/loads/wind", WIND, true),
            new Section("temperature", "/loads/temperature", "/loads/temperature", TEMPERATURE, true),
            new Section("self-weight", "/loads/self-weight", "/loads/selfWeight", SELF_WEIGHT, true),
            new Section("traffic-lm1", "/loads/traffic-lm1", "/loads/trafficLm1", TRAFFIC_LM1, true),
            new Section("wind-snapshot", "/loads/wind-snapshot", "/loads/windSnapshot", WIND_SNAPSHOT, true)};

    private static final Section GRAPH_SECTION = new Section("graph", "/graphs/g-1", "/graphs/0", graph("g-1"), false);

    private static final Section[] SECTIONS = Stream.concat(Stream.of(LOADS), Stream.of(GRAPH_SECTION))
            .toArray(Section[]::new);

    static Stream<Arguments> sections() {
        return Stream.of(SECTIONS).map(Arguments::of);
    }

    static Stream<Arguments> loadSections() {
        return Stream.of(LOADS).map(Arguments::of);
    }

    // ------------------------------------------------------------------ helpers

    private String createProject() throws Exception {
        String ws = """
                {"workspace":{"project":{"name":"p","id":"PRJ-01","client":"C","designer":"D","country":"TR","region":"R",
                 "projectType":"Viaduct","status":"Draft","startDate":"","targetDate":"","description":"d","locationStart":"",
                 "locationEnd":"","coordinateSystem":"","designStandardFamily":"","concreteCode":"","steelCode":"",
                 "compositeCode":"","seismicCode":"","geotechnicalCode":"","trafficLoadStandard":"",
                 "units":{"length":"m","force":"kN","moment":"kNm","stress":"MPa","mass":"t","temperature":"C"},
                 "coordinate":{"name":"","epsg":"","horizontalDatum":"","verticalDatum":"","originX":"","originY":"",
                  "originZ":"","northAngle":""},
                 "criteria":{"designLife":"","reliabilityClass":"","exposure":"","concreteClass":"","cover":"","philosophy":""},
                 "environment":{"terrainDatasetId":null,"landXmlImportId":null},"lastModified":""},"bridges":[]}}
                """;
        MvcResult r = postJson("/api/projects", ws);
        assertEquals(201, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        return body(r).get("projectId").asText();
    }

    private static String envelope(Long revision, String valueJson) {
        return "{" + (revision == null ? "" : "\"expectedRevision\":" + revision + ",") + "\"value\":" + valueJson + "}";
    }

    private MvcResult putPath(String projectId, String path, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.put("/api/projects/" + projectId + path)
                .contentType("application/json").content(body.getBytes(StandardCharsets.UTF_8))).andReturn();
    }

    private MvcResult put(String projectId, Section s, String body) throws Exception {
        return putPath(projectId, s.path(), body);
    }

    private JsonNode written(MvcResult r) throws Exception {
        assertEquals(200, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        return body(r);
    }

    private JsonNode doc(String projectId) throws Exception {
        return getOk("/api/projects/" + projectId);
    }

    private static List<String> keysOf(JsonNode node) {
        return StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(node.fieldNames(), 0), false)
                .toList();
    }

    /** Everything the M3 endpoints can touch, as plain rows, so "unchanged" means every table. */
    private Map<String, Object> dbState(String projectId) {
        UUID id = UUID.fromString(projectId);
        Map<String, Object> state = new LinkedHashMap<>(
                jdbc.queryForMap("select revision, updated_utc from project where id = ?", id));
        for (String table : List.of("load_seismic_input", "load_wind_input", "load_temperature_input",
                "load_self_weight_input", "load_traffic_lm1_factor", "load_wind_snapshot", "graph_document")) {
            state.put(table, jdbc.queryForList("select * from " + table + " where project_id = ?", id));
        }
        state.put("graph_children", jdbc.queryForList("select n.node_id, p.parameter_key, i.item_value "
                + "from graph_document d left join graph_node n on n.graph_document_id = d.id "
                + "left join graph_node_parameter p on p.graph_node_id = n.id "
                + "left join graph_node_parameter_item i on i.graph_node_parameter_id = p.id "
                + "where d.project_id = ? order by d.ordinal, n.node_index, p.parameter_index, i.item_index", id));
        state.put("graph_connections", jdbc.queryForList("select c.connection_id from graph_connection c "
                + "join graph_document d on d.id = c.graph_document_id where d.project_id = ?", id));
        state.put("graph_groups", jdbc.queryForList("select g.group_id from graph_group g "
                + "join graph_document d on d.id = g.graph_document_id where d.project_id = ?", id));
        state.put("presence", jdbc.queryForList("select section_key from project_section_presence where project_id = ?"
                + " order by section_key", id));
        return state;
    }

    private static List<String> fieldsOf(JsonNode errorBody) {
        List<String> fields = new ArrayList<>();
        errorBody.get("errors").forEach(e -> fields.add(e.get("field").asText()));
        return fields;
    }

    /** Writes a valid value first (revision 0 to 1), then expects the bad one at revision 1 to change nothing. */
    private void assertRejected(Section s, String valueJson, Long revision, String message, String... fields)
            throws Exception {
        assertRejectedAt(s, s.path(), valueJson, revision, message, fields);
    }

    private void assertRejectedAt(Section s, String path, String valueJson, Long revision, String message,
            String... fields) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));
        Map<String, Object> before = dbState(id);
        JsonNode docBefore = doc(id);

        MvcResult r = putPath(id, path, envelope(revision == null ? null : 1L, valueJson));

        assertEquals(400, r.getResponse().getStatus(), message + ": " + r.getResponse().getContentAsString());
        JsonNode b = body(r);
        assertEquals("INVALID_REQUEST", b.get("code").asText(), message);
        for (String field : fields) {
            assertTrue(fieldsOf(b).contains(field), message + ": expected " + field + " in " + fieldsOf(b));
        }
        assertEquals(before, dbState(id), message + ": database unchanged");
        assertEquals(docBefore, doc(id), message + ": document unchanged");
    }

    private JsonNode parse(String text) throws Exception {
        return json.readTree(text);
    }

    /** Parses the value, sets or removes the node at the pointer, and returns the changed JSON text. */
    private String change(String valueJson, String pointer, Object newValue) throws Exception {
        JsonNode root = parse(valueJson);
        JsonPointer ptr = JsonPointer.compile(pointer);
        JsonNode parent = root.at(ptr.head());
        String last = ptr.last().getMatchingProperty();
        if (parent instanceof ObjectNode object) {
            if (newValue == REMOVE) {
                object.remove(last);
            } else {
                object.set(last, newValue == null ? NullNode.getInstance() : parse(newValue.toString()));
            }
        } else if (parent instanceof ArrayNode array) {
            int index = Integer.parseInt(last);
            if (newValue == REMOVE) {
                array.remove(index);
            } else {
                JsonNode replacement = newValue == null ? NullNode.getInstance() : parse(newValue.toString());
                if (index == array.size()) {
                    array.add(replacement);
                } else {
                    array.set(index, replacement);
                }
            }
        } else {
            throw new IllegalArgumentException(pointer);
        }
        return root.toString();
    }

    private static final Object REMOVE = new Object();

    // ------------------------------------------------------------------ AC3 / AC8: round trip and revision

    @ParameterizedTest
    @MethodSource("sections")
    void put_roundTripsDeepEqual_raisesTheRevisionOnce_andTouchesNothingElse(Section s) throws Exception {
        String id = createProject();
        JsonNode before = doc(id);
        JsonNode value = parse(s.value());

        JsonNode result = written(put(id, s, envelope(0L, s.value())));

        assertEquals(id, result.get("projectId").asText());
        assertEquals(1, result.get("revision").asInt());
        assertEquals(value, result.get("value"));
        JsonNode after = doc(id);
        assertEquals(value, after.at(s.pointer()));
        assertEquals(1, after.get("revision").asInt());
        assertEquals(result.get("updatedAt"), after.get("updatedAt"));
        assertNotEquals(before.get("updatedAt"), after.get("updatedAt"));
        assertEquals(before.get("workspace"), after.get("workspace"));
        for (Section other : SECTIONS) {
            if (other != s) {
                assertEquals(before.at(other.pointer()), after.at(other.pointer()), other.name());
            }
        }
        for (String key : List.of("bridgeDefinitions", "families", "girderLibrary", "preferredSpanRules",
                "crossSection")) {
            assertEquals(before.get(key), after.get(key), key);
        }
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_secondWriteWithTheNewRevision_replacesTheSection(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));

        JsonNode second = written(put(id, s, envelope(1L, s.value())));

        assertEquals(2, second.get("revision").asInt());
        assertEquals(parse(s.value()), doc(id).at(s.pointer()));
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_staleRevision_is409_andChangesNothing(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));
        Map<String, Object> before = dbState(id);
        JsonNode docBefore = doc(id);

        MvcResult r = put(id, s, envelope(0L, s.value()));

        assertEquals(409, r.getResponse().getStatus());
        assertEquals("PROJECT_REVISION_CONFLICT", body(r).get("code").asText());
        assertEquals(before, dbState(id));
        assertEquals(docBefore, doc(id));
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_sameRevisionTwice_firstIs200_secondIs409(Section s) throws Exception {
        String id = createProject();

        MvcResult first = put(id, s, envelope(0L, s.value()));
        MvcResult second = put(id, s, envelope(0L, s.value()));

        assertEquals(200, first.getResponse().getStatus());
        assertEquals(409, second.getResponse().getStatus());
        assertEquals(1, doc(id).get("revision").asInt());
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_unknownProject_is404(Section s) throws Exception {
        MvcResult r = put("7b0f8f0e-1111-4222-8333-444455556666", s, envelope(0L, s.value()));

        assertEquals(404, r.getResponse().getStatus());
        assertEquals("PROJECT_NOT_FOUND", body(r).get("code").asText());
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_nonUuidPath_is400InvalidParameter(Section s) throws Exception {
        MvcResult r = put("not-a-uuid", s, envelope(0L, s.value()));

        assertEquals(400, r.getResponse().getStatus());
        assertEquals("INVALID_PARAMETER", body(r).get("code").asText());
    }

    // ------------------------------------------------------------------ AC11: common 400

    @ParameterizedTest
    @MethodSource("sections")
    void put_missingExpectedRevision_isRejected(Section s) throws Exception {
        assertRejected(s, s.value(), null, "missing revision", "expectedRevision");
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_missingValueKey_isRejected(Section s) throws Exception {
        String id = createProject();

        MvcResult r = put(id, s, "{\"expectedRevision\":0}");

        assertEquals(400, r.getResponse().getStatus());
        JsonNode b = body(r);
        assertTrue(fieldsOf(b).contains("value"));
        assertEquals("is required", b.get("errors").get(0).get("message").asText());
        assertEquals(0, doc(id).get("revision").asInt());
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_unknownField_isRejectedWithItsPath(Section s) throws Exception {
        assertRejected(s, change(s.value(), "/foo", "1"), 1L, "unknown field", "value.foo");
    }

    @Test
    void put_unknownFieldMessage_saysItIsNotAKnownField() throws Exception {
        String id = createProject();

        JsonNode b = body(put(id, LOADS[0], envelope(0L, change(SEISMIC, "/foo", "1"))));

        assertEquals("is not a known field", b.get("errors").get(0).get("message").asText());
    }

    @Test
    void put_overflowingNumbers_areRejectedWithTheirPaths() throws Exception {
        assertRejected(LOADS[3], SELF_WEIGHT.replace("\"asphaltThicknessM\":0.1", "\"asphaltThicknessM\":1e999"), 1L,
                "self weight overflow", "value.asphaltThicknessM");
        assertRejected(LOADS[5], WIND_SNAPSHOT.replace("\"deckWidthM\":13.8", "\"deckWidthM\":1e999"), 1L,
                "snapshot overflow", "value.inputs.deckWidthM");
        assertRejected(LOADS[5], WIND_SNAPSHOT.replace("\"cr\":0.30000000000000004", "\"cr\":1e999"), 1L,
                "snapshot result overflow", "value.result.cr");
        assertRejected(LOADS[4], TRAFFIC_LM1.replace("\"value\":300.0", "\"value\":1e999"), 1L, "lm1 overflow",
                "value.tandemSystem[0].characteristicValue.value");
        assertRejected(GRAPH_SECTION, graph("g-1").replace("\"x\":0.30000000000000004", "\"x\":1e999"), 1L,
                "graph overflow", "value.nodes[0].position.x");
    }

    @Test
    void put_nullRequiredFields_areRejectedWithTheirPaths() throws Exception {
        assertRejected(LOADS[0], change(SEISMIC, "/a", null), 1L, "seismic a", "value.a");
        assertRejected(LOADS[1], change(WIND, "/vb", null), 1L, "wind vb", "value.vb");
        assertRejected(LOADS[2], change(TEMPERATURE, "/min", null), 1L, "temperature min", "value.min");
        assertRejected(LOADS[3], change(SELF_WEIGHT, "/faciaCount", null), 1L, "self weight", "value.faciaCount");
        assertRejected(LOADS[3], change(SELF_WEIGHT, "/soundPanelUnitLoadKNm", REMOVE), 1L, "self weight absent",
                "value.soundPanelUnitLoadKNm");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/inputs/vb", null), 1L, "snapshot vb", "value.inputs.vb");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/inputs", null), 1L, "snapshot inputs", "value.inputs");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/schemaVersion", null), 1L, "snapshot version",
                "value.schemaVersion");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/name", null), 1L, "graph name", "value.name");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/nodes", null), 1L, "graph nodes", "value.nodes");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/connections", null), 1L, "graph connections",
                "value.connections");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/nodes/0/position", null), 1L, "node position",
                "value.nodes[0].position");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/nodes/0/parameters", null), 1L, "node parameters",
                "value.nodes[0].parameters");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/connections/0/sourcePortId", null), 1L, "port",
                "value.connections[0].sourcePortId");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/groups/0/color", null), 1L, "group color",
                "value.groups[0].color");
    }

    @Test
    void put_malformedJson_isMalformedRequestBody() throws Exception {
        String id = createProject();

        for (Section s : SECTIONS) {
            MvcResult broken = put(id, s, "{not json");
            assertEquals(400, broken.getResponse().getStatus(), s.name());
            assertEquals("MALFORMED_REQUEST_BODY", body(broken).get("code").asText(), s.name());
        }
    }

    // ------------------------------------------------------------------ AC4: null semantics

    @Test
    void newProject_hasEveryLoadNull_andNoGraphs() throws Exception {
        String id = createProject();

        JsonNode d = doc(id);

        assertEquals(List.of("projectId", "revision", "createdAt", "updatedAt", "workspace", "bridgeDefinitions",
                "families", "girderLibrary", "preferredSpanRules", "crossSection", "loads", "graphs"), keysOf(d));
        assertTrue(d.get("loads").isObject());
        assertEquals(List.of("seismic", "wind", "temperature", "selfWeight", "trafficLm1", "windSnapshot"),
                keysOf(d.get("loads")));
        d.get("loads").forEach(l -> assertTrue(l.isNull()));
        assertTrue(d.get("graphs").isArray());
        assertEquals(0, d.get("graphs").size());
        assertFalse(d.toString().contains("activeGraphId"));
    }

    @Test
    void create_responseCarriesLoadsAndGraphs() throws Exception {
        String id = createProject();
        // the POST body itself is checked through the same response builder as GET; check the 201 explicitly too
        MvcResult r = postJson("/api/projects", """
                {"workspace":{"project":{"name":"n","id":"i","client":"","designer":"","country":"","region":"",
                 "projectType":"","status":"","startDate":"","targetDate":"","description":"","locationStart":"",
                 "locationEnd":"","coordinateSystem":"","designStandardFamily":"","concreteCode":"","steelCode":"",
                 "compositeCode":"","seismicCode":"","geotechnicalCode":"","trafficLoadStandard":"",
                 "units":{"length":"","force":"","moment":"","stress":"","mass":"","temperature":""},
                 "coordinate":{"name":"","epsg":"","horizontalDatum":"","verticalDatum":"","originX":"","originY":"",
                  "originZ":"","northAngle":""},
                 "criteria":{"designLife":"","reliabilityClass":"","exposure":"","concreteClass":"","cover":"","philosophy":""},
                 "environment":{"terrainDatasetId":null,"landXmlImportId":null},"lastModified":""},"bridges":[]}}
                """);

        JsonNode created = body(r);

        assertEquals(201, r.getResponse().getStatus());
        assertTrue(created.get("loads").isObject());
        assertTrue(created.get("loads").get("seismic").isNull());
        assertTrue(created.get("loads").get("windSnapshot").isNull());
        assertTrue(created.get("graphs").isArray());
        assertEquals(0, created.get("graphs").size());
        assertEquals(id.length(), created.get("projectId").asText().length());
    }

    @ParameterizedTest
    @MethodSource("loadSections")
    void put_null_clearsTheLoad_andRaisesTheRevision(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));

        JsonNode cleared = written(put(id, s, envelope(1L, "null")));

        assertTrue(cleared.get("value").isNull());
        assertEquals(2, cleared.get("revision").asInt());
        JsonNode after = doc(id);
        assertTrue(after.at(s.pointer()).isNull());
        assertEquals(2, after.get("revision").asInt());
        assertEquals(0, jdbc.queryForObject("select count(*) from project_section_presence where project_id = ?",
                Integer.class, UUID.fromString(id)));
    }

    @ParameterizedTest
    @MethodSource("loadSections")
    void put_null_onAnEmptyLoad_isAcceptedToo(Section s) throws Exception {
        String id = createProject();

        JsonNode r = written(put(id, s, envelope(0L, "null")));

        assertEquals(1, r.get("revision").asInt());
        assertTrue(doc(id).at(s.pointer()).isNull());
    }

    @Test
    void put_nullGraph_isRejected_graphsCannotBeDeleted() throws Exception {
        assertRejected(GRAPH_SECTION, "null", 1L, "null graph", "value");
    }

    // ------------------------------------------------------------------ AC5: wind snapshot

    private boolean resultPresent(String projectId) {
        return jdbc.queryForObject("select result_present from load_wind_snapshot where project_id = ?",
                Boolean.class, UUID.fromString(projectId));
    }

    @Test
    void windSnapshot_storesAndReturnsTheResult_inKeyOrder() throws Exception {
        String id = createProject();

        JsonNode r = written(put(id, LOADS[5], envelope(0L, WIND_SNAPSHOT)));

        assertEquals(List.of("schemaVersion", "status", "inputs", "result"), keysOf(r.get("value")));
        assertEquals(List.of("schemaVersion", "status", "inputs", "result"), keysOf(doc(id).at("/loads/windSnapshot")));
        assertEquals(WIND_RESULT_KEYS, keysOf(r.get("value").get("result")));
        assertEquals(WIND_RESULT_KEYS, keysOf(doc(id).at("/loads/windSnapshot/result")));
        assertEquals(parse(WIND_SNAPSHOT), doc(id).at("/loads/windSnapshot"));
        assertTrue(resultPresent(id));
    }

    @Test
    void windSnapshot_invalidResult_roundTrips() throws Exception {
        String id = createProject();

        JsonNode r = written(put(id, LOADS[5], envelope(0L, WIND_SNAPSHOT_INVALID)));

        assertEquals(1, r.get("revision").asInt());
        assertEquals(parse(WIND_SNAPSHOT_INVALID), r.get("value"));
        assertEquals(parse(WIND_SNAPSHOT_INVALID), doc(id).at("/loads/windSnapshot"));
        assertTrue(doc(id).at("/loads/windSnapshot/result/transverseKNm").isNull());
        assertEquals("some text ç", doc(id).at("/loads/windSnapshot/result/missing").asText());
    }

    @Test
    void windSnapshot_resultNullOrAbsent_isStoredAsNull() throws Exception {
        for (Object noResult : new Object[] {null, REMOVE}) {
            String id = createProject();

            JsonNode r = written(put(id, LOADS[5], envelope(0L, change(WIND_SNAPSHOT, "/result", noResult))));

            assertEquals(List.of("schemaVersion", "status", "inputs", "result"), keysOf(r.get("value")));
            assertTrue(r.get("value").get("result").isNull());
            assertTrue(doc(id).at("/loads/windSnapshot/result").isNull());
            assertTrue(doc(id).at("/loads/windSnapshot").has("result"));
            assertFalse(resultPresent(id));
            Map<String, Object> row = jdbc.queryForMap("select * from load_wind_snapshot where project_id = ?",
                    UUID.fromString(id));
            row.forEach((column, value) -> {
                if (column.toLowerCase().startsWith("result_") && !column.equalsIgnoreCase("result_present")) {
                    assertNull(value, column);
                }
            });
        }
    }

    @Test
    void windSnapshot_unknownFieldInResult_isRejected() throws Exception {
        String withExtra = change(WIND_SNAPSHOT, "/result/x", "1");
        assertRejected(LOADS[5], withExtra, 1L, "result unknown field", "value.result.x");
        String id = createProject();

        JsonNode b = body(put(id, LOADS[5], envelope(0L, withExtra)));

        assertEquals("value.result.x", b.get("errors").get(0).get("field").asText());
        assertEquals("is not a known field", b.get("errors").get(0).get("message").asText());
    }

    @Test
    void windSnapshot_resultStatusMustBeKnown() throws Exception {
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/result/status", REMOVE), 1L, "result status absent",
                "value.result.status");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/result/status", null), 1L, "result status null",
                "value.result.status");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/result/status", "\"OK\""), 1L, "result status OK",
                "value.result.status");
        String id = createProject();

        JsonNode bad = body(put(id, LOADS[5], envelope(0L, change(WIND_SNAPSHOT, "/result/status", "\"OK\""))));
        JsonNode missing = body(put(id, LOADS[5], envelope(0L, change(WIND_SNAPSHOT, "/result/status", REMOVE))));

        assertEquals("must be one of: VALID, INVALID", bad.get("errors").get(0).get("message").asText());
        assertEquals("is required", missing.get("errors").get(0).get("message").asText());
    }

    @Test
    void windSnapshot_resultNumbersRequiredAndFinite() throws Exception {
        for (String field : List.of("z0M", "zminM", "kr", "cr", "vmMs", "turbulenceIntensity", "qpKNm2", "bOverD",
                "cfx")) {
            assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/result/" + field, REMOVE), 1L, field + " absent",
                    "value.result." + field);
            assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/result/" + field, null), 1L, field + " null",
                    "value.result." + field);
        }
        assertRejected(LOADS[5], WIND_SNAPSHOT.replace("\"qpKNm2\":1.0E-300", "\"qpKNm2\":1e999"), 1L, "qp overflow",
                "value.result.qpKNm2");
        assertRejected(LOADS[5], WIND_SNAPSHOT.replace("\"transverseKNm\":2.5", "\"transverseKNm\":1e999"), 1L,
                "transverse overflow", "value.result.transverseKNm");
        String id = createProject();
        JsonNode b = body(put(id, LOADS[5], envelope(0L, change(WIND_SNAPSHOT, "/result/kr", REMOVE))));
        JsonNode o = body(put(id, LOADS[5], envelope(0L,
                WIND_SNAPSHOT.replace("\"qpKNm2\":1.0E-300", "\"qpKNm2\":1e999"))));
        assertEquals("is required", b.get("errors").get(0).get("message").asText());
        assertEquals("must be a finite number", o.get("errors").get(0).get("message").asText());
        // transverseKNm null and missing null are fine
        written(put(id, LOADS[5], envelope(0L, change(change(WIND_SNAPSHOT, "/result/transverseKNm", null),
                "/result/missing", null))));
    }

    @Test
    void windSnapshot_noConsistencyRule() throws Exception {
        String id = createProject();
        String value = change(change(WIND_SNAPSHOT, "/result/missing", "\"still filled\""), "/status",
                "\"INVALID\"");

        JsonNode r = written(put(id, LOADS[5], envelope(0L, value)));

        assertEquals(parse(value), r.get("value"));
        assertEquals("VALID", r.get("value").at("/result/status").asText());
        assertEquals("INVALID", r.get("value").get("status").asText());
    }

    @Test
    void windSnapshot_statusIsOptional_andComesBackNull() throws Exception {
        String id = createProject();

        JsonNode r = written(put(id, LOADS[5], envelope(0L, change(WIND_SNAPSHOT, "/status", REMOVE))));

        assertTrue(r.get("value").get("status").isNull());
        assertTrue(doc(id).at("/loads/windSnapshot/status").isNull());
    }

    @Test
    void windSnapshot_schemaVersionMustBeOne() throws Exception {
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/schemaVersion", "2"), 1L, "version 2", "value.schemaVersion");
        assertRejected(LOADS[5], change(WIND_SNAPSHOT, "/schemaVersion", "0"), 1L, "version 0", "value.schemaVersion");
    }

    // ------------------------------------------------------------------ AC6: LM1

    @Test
    void lm1_unknownProvenance_listsTheAllowedConstants() throws Exception {
        String bad = TRAFFIC_LM1.replace("\"provenance\":\"CODE_DEFAULT\",\"codeDefaultValue\":300.0",
                "\"provenance\":\"code_default\",\"codeDefaultValue\":300.0");
        assertRejected(LOADS[4], bad, 1L, "bad provenance", "value.tandemSystem[0].characteristicValue.provenance");
        String id = createProject();

        JsonNode b = body(put(id, LOADS[4], envelope(0L, bad)));

        assertEquals("must be one of: CODE_DEFAULT, NATIONAL_ANNEX, PROJECT_OVERRIDE",
                b.get("errors").get(0).get("message").asText());
    }

    @Test
    void lm1_requiredPartsAreChecked() throws Exception {
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/remainingAreaUdl", null), 1L, "remaining null",
                "value.remainingAreaUdl");
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/remainingAreaUdl", REMOVE), 1L, "remaining absent",
                "value.remainingAreaUdl");
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/tandemSystem/0/adjustmentFactor", null), 1L, "adjustment null",
                "value.tandemSystem[0].adjustmentFactor");
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/tandemSystem/1/label", null), 1L, "label null",
                "value.tandemSystem[1].label");
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/udl", null), 1L, "udl null", "value.udl");
        assertRejected(LOADS[4], change(TRAFFIC_LM1, "/tandemSystem/0/characteristicValue/provenance", null), 1L,
                "provenance null", "value.tandemSystem[0].characteristicValue.provenance");
    }

    @Test
    void lm1_emptyListsAndNullValuesComeBackAsWritten_andLabelsMayRepeat() throws Exception {
        String id = createProject();

        written(put(id, LOADS[4], envelope(0L, TRAFFIC_LM1)));

        JsonNode lm1 = doc(id).at("/loads/trafficLm1");
        assertEquals(0, lm1.get("udl").size());
        assertEquals(2, lm1.get("tandemSystem").size());
        assertEquals("Q1k", lm1.at("/tandemSystem/1/label").asText());
        assertTrue(lm1.at("/remainingAreaUdl/characteristicValue/value").isNull());
        assertTrue(lm1.at("/remainingAreaUdl/characteristicValue/codeDefaultValue").isNull());
        assertEquals(-1.0, lm1.at("/tandemSystem/1/characteristicValue/value").asDouble());
    }

    @Test
    void lm1_emptyTandemSystem_isWrittenAndReadBackEmpty() throws Exception {
        String id = createProject();

        written(put(id, LOADS[4], envelope(0L, change(TRAFFIC_LM1, "/tandemSystem", "[]"))));

        assertEquals(0, doc(id).at("/loads/trafficLm1/tandemSystem").size());
        assertTrue(doc(id).at("/loads/trafficLm1/tandemSystem").isArray());
    }

    // ------------------------------------------------------------------ AC7 / AC8 / AC9: graphs

    @Test
    void graph_groupsNullAndEmpty_areDifferent_andOwnerIdsMayBeNull() throws Exception {
        String id = createProject();
        String noGroups = change(change(change(graph("a"), "/groups", REMOVE), "/projectId", null), "/bridgeId", null);
        String emptyGroups = change(graph("b"), "/groups", "[]");

        written(putPath(id, "/graphs/a", envelope(0L, noGroups)));
        written(putPath(id, "/graphs/b", envelope(1L, emptyGroups)));

        JsonNode graphs = doc(id).get("graphs");
        assertTrue(graphs.get(0).get("groups").isNull());
        assertTrue(graphs.get(0).get("projectId").isNull());
        assertTrue(graphs.get(0).get("bridgeId").isNull());
        assertTrue(graphs.get(1).get("groups").isArray());
        assertEquals(0, graphs.get(1).get("groups").size());
    }

    @Test
    void graphs_keepCreationOrder_andAnUpsertReplacesInPlace() throws Exception {
        String id = createProject();
        written(putPath(id, "/graphs/A", envelope(0L, graph("A"))));
        written(putPath(id, "/graphs/B", envelope(1L, graph("B"))));
        written(putPath(id, "/graphs/C", envelope(2L, graph("C"))));
        assertEquals(List.of("A", "B", "C"), idsOf(doc(id)));
        String newB = """
                {"id":"B","name":"B replaced","schemaVersion":1,"projectId":null,"bridgeId":null,
                 "nodes":[{"id":"x","type":"t","name":"","position":{"x":1.0,"y":2.0},
                           "parameters":[{"key":"k","kind":"NUMBER","value":-0.5}]}],
                 "connections":[],"groups":null}""";
        JsonNode before = doc(id);

        JsonNode r = written(putPath(id, "/graphs/B", envelope(3L, newB)));

        assertEquals(4, r.get("revision").asInt());
        JsonNode after = doc(id);
        assertEquals(List.of("A", "B", "C"), idsOf(after));
        assertEquals(parse(newB), after.at("/graphs/1"));
        assertEquals(before.at("/graphs/0"), after.at("/graphs/0"));
        assertEquals(before.at("/graphs/2"), after.at("/graphs/2"));
        UUID uid = UUID.fromString(id);
        assertEquals(1, jdbc.queryForObject("select count(*) from graph_node n join graph_document d on "
                + "d.id = n.graph_document_id where d.project_id = ? and d.graph_id = 'B'", Integer.class, uid));
        assertEquals(0, jdbc.queryForObject("select count(*) from graph_connection c join graph_document d on "
                + "d.id = c.graph_document_id where d.project_id = ? and d.graph_id = 'B'", Integer.class, uid));
        assertEquals(0, jdbc.queryForObject("select count(*) from graph_group g join graph_document d on "
                + "d.id = g.graph_document_id where d.project_id = ? and d.graph_id = 'B'", Integer.class, uid));
        assertEquals(3, jdbc.queryForObject("select count(*) from graph_document where project_id = ?",
                Integer.class, uid));
    }

    private static List<String> idsOf(JsonNode document) {
        List<String> ids = new ArrayList<>();
        document.get("graphs").forEach(g -> ids.add(g.get("id").asText()));
        return ids;
    }

    @Test
    void graphUpsert_withReorderedNodesAndConnections_hasNoUniqueViolation() throws Exception {
        String id = createProject();
        written(putPath(id, "/graphs/g-1", envelope(0L, graph("g-1"))));
        JsonNode original = parse(graph("g-1"));
        ObjectNode reordered = original.deepCopy();
        ArrayNode nodes = reordered.putArray("nodes");
        nodes.add(original.at("/nodes/1"));
        nodes.add(original.at("/nodes/0"));

        JsonNode r = written(putPath(id, "/graphs/g-1", envelope(1L, reordered.toString())));

        assertEquals(reordered, r.get("value"));
        assertEquals(reordered, doc(id).at("/graphs/0"));
    }

    @Test
    void graph_pathAndBodyIdMustMatch() throws Exception {
        assertRejectedAt(GRAPH_SECTION, "/graphs/other", graph("g-1"), 1L, "path mismatch", "value.id");
        assertRejectedAt(GRAPH_SECTION, "/graphs/g-1", graph("other"), 1L, "body mismatch", "value.id");
    }

    @Test
    void graph_invalidStructure_isRejectedWithPathsAndChangesNothing() throws Exception {
        String g = graph("g-1");
        assertRejected(GRAPH_SECTION, change(g, "/connections/0/sourceNodeId", "\"ghost\""), 1L, "source node",
                "value.connections[0].sourceNodeId");
        assertRejected(GRAPH_SECTION, change(g, "/connections/0/targetNodeId", "\"ghost\""), 1L, "target node",
                "value.connections[0].targetNodeId");
        assertRejected(GRAPH_SECTION, change(g, "/groups/0/nodeIds/1", "\"ghost\""), 1L, "group node",
                "value.groups[0].nodeIds[1]");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/1/id", "\"n-1\""), 1L, "duplicate node id",
                "value.nodes[1].id");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/1/id", "\"\""), 1L, "blank node id", "value.nodes[1].id");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/1/id", null), 1L, "null node id", "value.nodes[1].id");
        assertRejected(GRAPH_SECTION, addConnection(g, "e-1"), 1L, "duplicate connection id",
                "value.connections[1].id");
        assertRejected(GRAPH_SECTION, addConnection(g, ""), 1L, "blank connection id", "value.connections[1].id");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/1/key", "\"value\""), 1L, "duplicate key",
                "value.nodes[0].parameters[1].key");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/5/key", "\"unit\""), 1L, "duplicate key 2",
                "value.nodes[0].parameters[5].key");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/0/key", null), 1L, "null key",
                "value.nodes[0].parameters[0].key");
    }

    private String addConnection(String g, String connectionId) throws Exception {
        return change(g, "/connections/1", "{\"id\":\"" + connectionId + "\",\"sourceNodeId\":\"n-1\","
                + "\"sourcePortId\":\"a\",\"targetNodeId\":\"n-2\",\"targetPortId\":\"b\"}");
    }

    @Test
    void graph_duplicateNodeIdMessage_namesTheFirstOccurrence() throws Exception {
        String id = createProject();

        JsonNode b = body(putPath(id, "/graphs/g-1", envelope(0L, change(graph("g-1"), "/nodes/1/id", "\"n-1\""))));

        JsonNode first = b.get("errors").get(0);
        assertEquals("value.nodes[1].id", first.get("field").asText());
        assertEquals("duplicates nodes[0].id", first.get("message").asText());
    }

    @Test
    void graph_parameterKindAndValueMustAgree() throws Exception {
        String g = graph("g-1");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/0/kind", "\"number[]\""), 1L, "unknown kind",
                "value.nodes[0].parameters[0].kind");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/0/value", "\"5\""), 1L, "number as text",
                "value.nodes[0].parameters[0].value");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/1/value", "\"false\""), 1L, "boolean as text",
                "value.nodes[0].parameters[1].value");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/2/value", "5"), 1L, "string as number",
                "value.nodes[0].parameters[2].value");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/3/value", "[1,\"a\"]"), 1L, "mixed array",
                "value.nodes[0].parameters[3].value[1]");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/3/value", "5"), 1L, "array as number",
                "value.nodes[0].parameters[3].value");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/0/value", null), 1L, "null value",
                "value.nodes[0].parameters[0].value");
        assertRejected(GRAPH_SECTION, change(g, "/nodes/0/parameters/0/kind", null), 1L, "null kind",
                "value.nodes[0].parameters[0].kind");
    }

    @Test
    void graph_schemaVersionMustBeOne() throws Exception {
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/schemaVersion", "2"), 1L, "version", "value.schemaVersion");
    }

    @Test
    void graph_uiOnlyFields_areRejected() throws Exception {
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/activeGraphId", "\"g-1\""), 1L, "activeGraphId",
                "value.activeGraphId");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/nodes/0/selected", "true"), 1L, "selected",
                "value.nodes[0].selected");
        assertRejected(GRAPH_SECTION, change(graph("g-1"), "/nodes/0/position/z", "1"), 1L, "z",
                "value.nodes[0].position.z");
    }

    @Test
    void graph_acceptedOddities_repeatedGroupIds_sharedBridgeIds_unknownPorts_andNodeTypes() throws Exception {
        String id = createProject();

        JsonNode first = written(putPath(id, "/graphs/a", envelope(0L, graph("a"))));
        JsonNode second = written(putPath(id, "/graphs/b", envelope(1L, graph("b"))));

        assertEquals("group-001", first.at("/value/groups/0/id").asText());
        assertEquals("group-001", second.at("/value/groups/1/id").asText());
        assertEquals("b-1", doc(id).at("/graphs/0/bridgeId").asText());
        assertEquals("b-1", doc(id).at("/graphs/1/bridgeId").asText());
        assertEquals("not.in.registry", doc(id).at("/graphs/1/nodes/1/type").asText());
    }

    @Test
    void graph_parameterValues_keepTheirBitsAndOrder() throws Exception {
        String id = createProject();

        written(putPath(id, "/graphs/g-1", envelope(0L, graph("g-1"))));

        JsonNode node = doc(id).at("/graphs/0/nodes/0");
        assertEquals(Double.doubleToLongBits(0.30000000000000004),
                Double.doubleToLongBits(node.at("/position/x").asDouble()));
        List<String> keys = new ArrayList<>();
        node.get("parameters").forEach(p -> keys.add(p.get("key").asText()));
        assertEquals(List.of("value", "enabled", "unit", "list", "none", ""), keys);
        assertEquals(0, node.at("/parameters/4/value").size());
        assertTrue(node.at("/parameters/4/value").isArray());
    }

    // ------------------------------------------------------------------ AC12 / AC13: isolation and engineering safety

    @Test
    void workspaceAndM2Writes_leaveLoadsAndGraphsAlone_andViceVersa() throws Exception {
        String id = createProject();
        written(put(id, LOADS[0], envelope(0L, SEISMIC)));
        written(put(id, GRAPH_SECTION, envelope(1L, graph("g-1"))));
        written(putPath(id, "/cross-section", envelope(2L, """
                {"platformWidthM":13.8,"leftWalkwayM":1.0,"rightWalkwayM":1.5,"spaceOfGirderM":2.0,
                 "numberOfGirders":5.0}""")));
        JsonNode ws = doc(id).get("workspace");

        written(putPath(id, "/workspace", envelope(3L, ws.toString())));

        JsonNode after = doc(id);
        assertEquals(4, after.get("revision").asInt());
        assertEquals(parse(SEISMIC), after.at("/loads/seismic"));
        assertEquals(parse(graph("g-1")), after.at("/graphs/0"));
        assertEquals(13.8, after.at("/crossSection/platformWidthM").asDouble());
        JsonNode summary = null;
        for (JsonNode n : getOk("/api/projects")) {
            if (n.get("projectId").asText().equals(id)) {
                summary = n;
            }
        }
        assertEquals(List.of("projectId", "name", "revision", "createdAt", "updatedAt"), keysOf(summary));
    }

    /** Project units are a display preference only: changing them must not touch any (canonical) load section. */
    @Test
    void workspaceUnitChange_leavesEveryLoadSectionUnchanged() throws Exception {
        String id = createProject();
        for (int i = 0; i < LOADS.length; i++) {
            written(put(id, LOADS[i], envelope((long) i, LOADS[i].value())));
        }
        JsonNode before = doc(id);
        ObjectNode ws = (ObjectNode) before.get("workspace").deepCopy();
        ObjectNode units = (ObjectNode) ws.at("/project/units");
        units.put("force", "tonf");
        units.put("length", "mm");
        units.put("temperature", "F");

        written(putPath(id, "/workspace", envelope((long) LOADS.length, ws.toString())));

        JsonNode after = doc(id);
        assertEquals("tonf", after.at("/workspace/project/units/force").asText());
        assertEquals("mm", after.at("/workspace/project/units/length").asText());
        assertEquals("F", after.at("/workspace/project/units/temperature").asText());
        for (String key : List.of("seismic", "wind", "temperature", "selfWeight", "trafficLm1", "windSnapshot")) {
            assertEquals(before.at("/loads/" + key), after.at("/loads/" + key), key);
        }
        for (Section s : LOADS) {
            assertEquals(parse(s.value()), after.at(s.pointer()), s.name());
        }
    }

    @Test
    void m3Writes_leaveWorkspaceAndM2SectionsAlone() throws Exception {
        String id = createProject();
        written(putPath(id, "/cross-section", envelope(0L, """
                {"platformWidthM":13.8,"leftWalkwayM":1.0,"rightWalkwayM":1.5,"spaceOfGirderM":2.0,
                 "numberOfGirders":5.0}""")));
        JsonNode before = doc(id);

        for (int i = 0; i < LOADS.length; i++) {
            written(put(id, LOADS[i], envelope(1L + i, LOADS[i].value())));
        }
        written(put(id, GRAPH_SECTION, envelope(1L + LOADS.length, graph("g-1"))));

        JsonNode after = doc(id);
        for (String key : List.of("workspace", "bridgeDefinitions", "families", "girderLibrary",
                "preferredSpanRules", "crossSection")) {
            assertEquals(before.get(key), after.get(key), key);
        }
        assertEquals(2 + LOADS.length, after.get("revision").asInt());
    }

    @Test
    void engineeringNonsense_isAcceptedAndStoredUnchanged() throws Exception {
        String id = createProject();

        written(put(id, LOADS[0], envelope(0L, SEISMIC)));
        written(put(id, LOADS[3], envelope(1L, SELF_WEIGHT)));
        written(put(id, LOADS[4], envelope(2L, TRAFFIC_LM1)));

        JsonNode d = doc(id);
        assertEquals("Z", d.at("/loads/seismic/g").asText());
        assertEquals("", d.at("/loads/seismic/i").asText());
        assertEquals(-24.0, d.at("/loads/selfWeight/asphaltUnitWeightKNm3").asDouble());
        assertEquals(0.0, d.at("/loads/selfWeight/sidewalkUnitWeightKNm3").asDouble());
        assertEquals(Double.doubleToLongBits(0.30000000000000004),
                Double.doubleToLongBits(d.at("/loads/selfWeight/sidewalkThicknessM").asDouble()));
        assertEquals(-1.0, d.at("/loads/trafficLm1/tandemSystem/1/characteristicValue/value").asDouble());
        assertEquals("abc", parse(WIND).get("ze").asText());
    }

    // ------------------------------------------------------------------ CORS

    @Test
    void corsPreflight_forEveryM3Put_isAcceptedFromTheViteOrigin() throws Exception {
        for (Section s : SECTIONS) {
            MvcResult r = mvc.perform(MockMvcRequestBuilders
                    .options("/api/projects/7b0f8f0e-1111-4222-8333-444455556666" + s.path())
                    .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "PUT"))
                    .andReturn();
            assertEquals(200, r.getResponse().getStatus(), s.path());
            assertEquals("http://localhost:5173", r.getResponse().getHeader("Access-Control-Allow-Origin"), s.path());
        }
    }
}
