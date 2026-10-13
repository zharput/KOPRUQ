package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * backend-db-persistence M2: the nine design-system {@code PUT} endpoints and the new document fields. The test
 * database is shared and committed by the contract tests, so every test looks only at the projects it created itself.
 * The numbers and texts are arbitrary test data, not engineering data.
 */
class ProjectDesignSystemApiContractTest extends ContractTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    // ------------------------------------------------------------------ section fixtures (all fields explicit)

    private static final String AXIS_ASSIGNMENT_P1 = """
            {"axisId":"P1","pierFamilyId":"RECT-M","pierHeightM":12.5,"pierCapFamilyId":null,"foundationFamilyId":null,
             "foundationElevationM":-3.0,"soilReference":"soil ü","bearingFamilyId":null,"bearingQuantity":null,
             "bearingOrientation":"","longitudinalBehavior":"","transverseBehavior":""}""";

    private static final String BRIDGE_DEFINITIONS = """
            {"definitions":[
              {"definitionKey":"b-1","bridgeId":"other-id","spanLengthsM":[30.0,0.30000000000000004],
               "axes":[{"id":"A1","name":"Kenar ç","type":"ABUTMENT","chainageM":0.0,"elevationM":null,"skewDegrees":null},
                       {"id":"P1","name":"P1","type":"PIER","chainageM":30.0,"elevationM":12.5,"skewDegrees":-5.5},
                       {"id":"P1","name":"same id again","type":"PIER","chainageM":-4.0,"elevationM":0.0,"skewDegrees":0.0}],
               "superstructureType":"Precast Girder","girderFamilyId":null,"girderVariantId":"PG-H160","girderCount":5.0,
               "deckWidthOverrideM":null,"axisAssignments":[%s],
               "abutmentFamilyIds":{"A1":"AB-1","A2":null},"constructionMethod":"","constructionStagesNote":"stages ş",
               "constraints":[{"id":"c-1","kind":"RIVER","name":"x","startChainageM":10.0,"endChainageM":5.0,"note":""},
                              {"id":"c-1","kind":"OTHER","name":"","startChainageM":null,"endChainageM":null,"note":""}]},
              {"definitionKey":"b-2","bridgeId":"","spanLengthsM":[],"axes":[],"superstructureType":"","girderFamilyId":null,
               "girderVariantId":null,"girderCount":null,"deckWidthOverrideM":null,"axisAssignments":[],
               "abutmentFamilyIds":{"A1":null,"A2":null},"constructionMethod":"","constructionStagesNote":"","constraints":[]}]}
            """.formatted(AXIS_ASSIGNMENT_P1);

    private static final String PIERS = """
            [{"id":"RECT-M","name":"Dikdörtgen","pierType":"H_TYPE","enabled":false,"source":"PROJECT_DESIGN_SYSTEM",
              "dimensions":[{"key":"B","label":"Transverse Length (m)","min":3.0,"max":0.30000000000000004,"delta":-1.0}],
              "allowedConfigurations":["SINGLE_COLUMN","TWO_COLUMNS","free text"],
              "twoColumnSpacing":{"key":"spacing","label":"Spacing (m)","min":6.0,"max":10.0,"delta":1.0},
              "heightApplicability":{"minimumHeight":1.0,"preferredHeightMin":null,"preferredHeightMax":3.0,"maximumHeight":2.0}},
             {"id":"WALL-1","name":"Wall","pierType":"WALL","enabled":true,"source":"","dimensions":[],
              "allowedConfigurations":[],"twoColumnSpacing":null,
              "heightApplicability":{"minimumHeight":null,"preferredHeightMin":null,"preferredHeightMax":null,"maximumHeight":null}},
             {"id":"BARE","name":null,"pierType":null,"enabled":null,"source":null,"dimensions":null,
              "allowedConfigurations":null,"twoColumnSpacing":null,"heightApplicability":null}]
            """;

    private static final String PIER_CAPS = """
            [{"id":"CAP-1","name":"Cap ş","capType":"T_CAP","compatiblePierConfiguration":"TWO_COLUMNS","enabled":true,
              "source":"src","capTransverseLength":{"min":9.0,"max":1.0,"delta":0.0},
              "capStructuralHeight":{"min":null,"max":null,"delta":null},"stemWidth":null},
             {"id":"CAP-2","name":null,"capType":"RECTANGULAR","compatiblePierConfiguration":"SINGLE_COLUMN","enabled":null,
              "source":null,"capTransverseLength":{"min":1.0,"max":null,"delta":null},"capStructuralHeight":null,"stemWidth":null}]
            """;

    private static final String FOUNDATIONS = """
            [{"id":"F-1","name":"Kazik","foundationType":"PILED","enabled":true,"source":"src","shallowGeneration":null,
              "piledGeneration":{"pileDiameter":{"min":0.8,"max":1.2,"delta":0.2},"pileCountX":{"min":2.0,"max":4.0,"delta":1.0},
               "pileSpacingX":{"min":2.5,"max":3.0,"delta":0.5},"pileCountY":{"min":2.0,"max":3.0,"delta":1.0},
               "pileSpacingY":{"min":2.5,"max":3.0,"delta":0.5},"height":{"min":null,"max":null,"delta":null}}},
             {"id":"F-2","name":"Shallow","foundationType":"SHALLOW","enabled":false,"source":null,
              "shallowGeneration":{"lengthX":{"min":5.0,"max":4.0,"delta":1.0},"lengthY":{"min":1.0,"max":2.0,"delta":0.0},
               "height":{"min":0.30000000000000004,"max":1.0,"delta":1.0}},"piledGeneration":null}]
            """;

    private static final String BEARINGS = """
            [{"id":"B-1","name":"Elastomeric","bearingType":"ELASTOMERIC","enabled":true,"source":"src",
              "length":{"min":300.0,"max":500.0,"delta":50.0},"width":{"min":300.0,"max":500.0,"delta":50.0},
              "height":{"min":40.0,"max":20.0,"delta":0.0}},
             {"id":"B-2","name":null,"bearingType":null,"enabled":false,"source":null,
              "length":{"min":null,"max":null,"delta":null},"width":null,"height":{"min":1.0,"max":1.0,"delta":1.0}}]
            """;

    private static final String MATERIALS = """
            [{"id":"FOUNDATION","no":2.0,"element":"Foundation","concreteClass":"C30/37 Ç"},
             {"id":"BARE","no":null,"element":null,"concreteClass":null}]
            """;

    private static final String GIRDER_LIBRARY = """
            {"enabled":true,"dimensions":[{"key":"H","label":"H (cm)","min":160.0,"max":190.0,"delta":10.0}]}
            """;

    private static final String PREFERRED_SPAN_RULES = """
            [{"id":"girder-span-PG-H160","superstructureType":"PRECAST_GIRDER","girderVariantId":"PG-H160","minSpan":5.0,
              "maxSpan":-1.0,"spanDelta":0.0,"primarySpan":0.30000000000000004,"enabled":true,"source":"PROJECT_DESIGN_SYSTEM"},
             {"id":"girder-span-PG-H160","superstructureType":"other","girderVariantId":"PG-H160","minSpan":0.0,
              "maxSpan":0.0,"spanDelta":0.0,"primarySpan":0.0,"enabled":false,"source":""}]
            """;

    private static final String CROSS_SECTION = """
            {"platformWidthM":13.8,"leftWalkwayM":1.0,"rightWalkwayM":1.5,"spaceOfGirderM":0.30000000000000004,
             "numberOfGirders":5.0}
            """;

    /** A section: endpoint path, where it appears in the project document (JSON pointer) and a valid value. */
    record Section(String name, String path, String pointer, String value, boolean clearable, String[] tables) {
        @Override
        public String toString() {
            return name;
        }
    }

    private static final Section[] SECTIONS = {
            new Section("bridge-definitions", "/bridge-definitions", "/bridgeDefinitions", BRIDGE_DEFINITIONS, false,
                    new String[] {"bridge_definition"}),
            new Section("piers", "/families/piers", "/families/piers", PIERS, false, new String[] {"family_pier"}),
            new Section("pier-caps", "/families/pier-caps", "/families/pierCaps", PIER_CAPS, false,
                    new String[] {"family_pier_cap"}),
            new Section("foundations", "/families/foundations", "/families/foundations", FOUNDATIONS, false,
                    new String[] {"family_foundation"}),
            new Section("bearings", "/families/bearings", "/families/bearings", BEARINGS, false,
                    new String[] {"family_bearing"}),
            new Section("materials", "/families/materials", "/families/materials", MATERIALS, false,
                    new String[] {"family_material"}),
            new Section("girder-library", "/girder-library", "/girderLibrary", GIRDER_LIBRARY, true,
                    new String[] {"girder_library"}),
            new Section("preferred-span-rules", "/preferred-span-rules", "/preferredSpanRules", PREFERRED_SPAN_RULES,
                    true, new String[] {"preferred_span_rule"}),
            new Section("cross-section", "/cross-section", "/crossSection", CROSS_SECTION, true,
                    new String[] {"cross_section"})};

    static Stream<Arguments> sections() {
        return Stream.of(SECTIONS).map(Arguments::of);
    }

    static Stream<Arguments> clearableSections() {
        return Stream.of(SECTIONS).filter(Section::clearable).map(Arguments::of);
    }

    static Stream<Arguments> requiredSections() {
        return Stream.of(SECTIONS).filter(s -> !s.clearable()).map(Arguments::of);
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

    private MvcResult put(String projectId, Section s, String body) throws Exception {
        return putPath(projectId, s.path(), body);
    }

    private MvcResult putPath(String projectId, String path, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.put("/api/projects/" + projectId + path)
                .contentType("application/json").content(body.getBytes(StandardCharsets.UTF_8))).andReturn();
    }

    private JsonNode written(MvcResult r) throws Exception {
        assertEquals(200, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        return body(r);
    }

    private JsonNode doc(String projectId) throws Exception {
        return getOk("/api/projects/" + projectId);
    }

    private Map<String, Object> dbState(String projectId, Section s) {
        UUID id = UUID.fromString(projectId);
        Map<String, Object> state = new LinkedHashMap<>(
                jdbc.queryForMap("select revision, updated_utc from project where id = ?", id));
        for (String table : s.tables()) {
            state.put(table, jdbc.queryForList("select * from " + table + " where project_id = ?", id));
        }
        state.put("presence", jdbc.queryForList("select section_key from project_section_presence where project_id = ?"
                + " order by section_key", id));
        return state;
    }

    private static List<String> fieldsOf(JsonNode errorBody) {
        List<String> fields = new ArrayList<>();
        errorBody.get("errors").forEach(e -> fields.add(e.get("field").asText()));
        return fields;
    }

    private void assertRejected(Section s, String valueJson, Long revision, String message, String... fields)
            throws Exception {
        String id = createProject();
        Map<String, Object> before = dbState(id, s);
        JsonNode docBefore = doc(id);

        MvcResult r = put(id, s, envelope(revision, valueJson));

        assertEquals(400, r.getResponse().getStatus(), message + ": " + r.getResponse().getContentAsString());
        JsonNode b = body(r);
        assertEquals("INVALID_REQUEST", b.get("code").asText(), message);
        for (String field : fields) {
            assertTrue(fieldsOf(b).contains(field), message + ": expected " + field + " in " + fieldsOf(b));
        }
        assertEquals(before, dbState(id, s), message + ": database unchanged");
        assertEquals(docBefore, doc(id), message + ": document unchanged");
    }

    private Section section(String name) {
        for (Section s : SECTIONS) {
            if (s.name().equals(name)) {
                return s;
            }
        }
        throw new IllegalArgumentException(name);
    }

    // ------------------------------------------------------------------ AC3 / AC4: round trip and revision

    @ParameterizedTest
    @MethodSource("sections")
    void put_roundTripsDeepEqual_raisesTheRevisionOnce_andTouchesNothingElse(Section s) throws Exception {
        String id = createProject();
        JsonNode before = doc(id);
        JsonNode value = json.readTree(s.value());

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
    }

    @ParameterizedTest
    @MethodSource("sections")
    void put_secondWriteWithTheNewRevision_replacesTheSection(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));

        JsonNode second = written(put(id, s, envelope(1L, s.value())));

        assertEquals(2, second.get("revision").asInt());
        assertEquals(json.readTree(s.value()), doc(id).at(s.pointer()));
    }

    @Test
    void put_reorderedAndShrunkLists_replaceChildRowsToo() throws Exception {
        String id = createProject();
        Section defs = section("bridge-definitions");
        written(put(id, defs, envelope(0L, BRIDGE_DEFINITIONS)));
        UUID uid = UUID.fromString(id);
        assertEquals(3, jdbc.queryForObject("select count(*) from bridge_definition_axis a join bridge_definition d on "
                + "d.id = a.bridge_definition_id where d.project_id = ?", Integer.class, uid));

        ArrayNodeHelper reordered = new ArrayNodeHelper(json.readTree(BRIDGE_DEFINITIONS));
        written(put(id, defs, envelope(1L, reordered.reversed())));
        assertEquals("b-2", doc(id).at("/bridgeDefinitions/definitions/0/definitionKey").asText());

        written(put(id, defs, envelope(2L, reordered.onlyFirstOfReversed())));
        assertEquals(0, jdbc.queryForObject("select count(*) from bridge_definition_axis a join bridge_definition d on "
                + "d.id = a.bridge_definition_id where d.project_id = ?", Integer.class, uid));
        assertEquals(1, jdbc.queryForObject("select count(*) from bridge_definition where project_id = ?",
                Integer.class, uid));

        Section piers = section("piers");
        written(put(id, piers, envelope(3L, PIERS)));
        written(put(id, piers, envelope(4L, "[]")));
        assertEquals(0, jdbc.queryForObject("select count(*) from family_pier_dimension d join family_pier f on "
                + "f.id = d.pier_family_id where f.project_id = ?", Integer.class, uid));
    }

    /** Small JSON surgery on the bridge definitions fixture. */
    private static final class ArrayNodeHelper {
        private final JsonNode root;

        ArrayNodeHelper(JsonNode root) {
            this.root = root;
        }

        String reversed() {
            JsonNode defs = root.get("definitions");
            return "{\"definitions\":[" + defs.get(1) + "," + defs.get(0) + "]}";
        }

        String onlyFirstOfReversed() {
            return "{\"definitions\":[" + root.get("definitions").get(1) + "]}";
        }
    }

    // ------------------------------------------------------------------ AC5: 409

    @ParameterizedTest
    @MethodSource("sections")
    void put_staleRevision_is409_andChangesNothing(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));
        Map<String, Object> before = dbState(id, s);
        JsonNode docBefore = doc(id);

        MvcResult r = put(id, s, envelope(0L, s.value()));

        assertEquals(409, r.getResponse().getStatus());
        assertEquals("PROJECT_REVISION_CONFLICT", body(r).get("code").asText());
        assertEquals(before, dbState(id, s));
        assertEquals(docBefore, doc(id));
    }

    private static String emptyValue(Section s) {
        return s.name().equals("bridge-definitions") ? "{\"definitions\":[]}" : "[]";
    }

    @Test
    void put_sameRevisionTwice_firstIs200_secondIs409() throws Exception {
        String id = createProject();
        Section s = section("materials");

        assertEquals(200, put(id, s, envelope(0L, MATERIALS)).getResponse().getStatus());
        assertEquals(409, put(id, s, envelope(0L, "[]")).getResponse().getStatus());

        assertEquals(json.readTree(MATERIALS), doc(id).at("/families/materials"));
    }

    // ------------------------------------------------------------------ AC7: 404 / path

    @ParameterizedTest
    @MethodSource("sections")
    void put_unknownProject_is404(Section s) throws Exception {
        MvcResult r = put("7b0f8f0e-1111-4222-8333-444455556666", s, envelope(0L, s.value()));

        assertEquals(404, r.getResponse().getStatus());
        assertEquals("PROJECT_NOT_FOUND", body(r).get("code").asText());
    }

    @Test
    void put_nonUuidPath_is400InvalidParameter() throws Exception {
        MvcResult r = put("not-a-uuid", section("cross-section"), envelope(0L, CROSS_SECTION));

        assertEquals(400, r.getResponse().getStatus());
        assertEquals("INVALID_PARAMETER", body(r).get("code").asText());
    }

    // ------------------------------------------------------------------ AC6: 400

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
        assertTrue(fieldsOf(body(r)).contains("value"));
        assertEquals(0, doc(id).get("revision").asInt());
    }

    @ParameterizedTest
    @MethodSource("requiredSections")
    void put_nullValue_isRejectedForFamiliesAndBridgeDefinitions(Section s) throws Exception {
        assertRejected(s, "null", 0L, "null value", "value");
    }

    @Test
    void put_unknownFields_areRejectedWithTheirPaths() throws Exception {
        assertRejected(section("piers"), PIERS.replace("\"id\":\"BARE\"", "\"foo\":1,\"id\":\"BARE\""), 0L,
                "unknown family field", "value[2].foo");
        assertRejected(section("cross-section"), CROSS_SECTION.replace("{", "{\"extra\":true,"), 0L,
                "unknown cross section field", "value.extra");
        assertRejected(section("bridge-definitions"),
                BRIDGE_DEFINITIONS.replace("{\"definitionKey\":\"b-2\"", "{\"selectedAxisId\":\"P1\",\"definitionKey\":\"b-2\""),
                0L, "ui state in definition", "value.definitions[1].selectedAxisId");
        assertRejected(section("bridge-definitions"),
                BRIDGE_DEFINITIONS.replace("{\"definitions\"", "{\"selectedBridgeId\":\"b-1\",\"definitions\""),
                0L, "ui state in section", "value.selectedBridgeId");
        assertRejected(section("bridge-definitions"),
                BRIDGE_DEFINITIONS.replace("{\"definitions\"", "{\"keyBy\":\"bridgeId\",\"definitions\""),
                0L, "key mode in section", "value.keyBy");
        assertRejected(section("bridge-definitions"),
                BRIDGE_DEFINITIONS.replace("\"constructionMethod\":\"\",\"constructionStagesNote\":\"stages",
                        "\"viewMode\":\"3d\",\"terrainVisible\":true,\"selectedConstraintId\":\"c\","
                                + "\"constructionMethod\":\"\",\"constructionStagesNote\":\"stages"),
                0L, "more ui state", "value.definitions[0].viewMode");
    }

    @Test
    void put_unknownFieldMessage_saysItIsNotAKnownField() throws Exception {
        String id = createProject();

        JsonNode b = body(put(id, section("cross-section"), envelope(0L, CROSS_SECTION.replace("{", "{\"extra\":1,"))));

        assertEquals("is not a known field", b.get("errors").get(0).get("message").asText());
    }

    @Test
    void put_overflowingNumbers_areRejectedWithTheirPaths() throws Exception {
        String id = createProject();
        MvcResult cross = put(id, section("cross-section"),
                envelope(0L, CROSS_SECTION.replace("\"platformWidthM\":13.8", "\"platformWidthM\":1e999")));
        MvcResult dim = put(id, section("piers"),
                envelope(0L, PIERS.replace("\"min\":3.0", "\"min\":1e999")));

        for (MvcResult r : List.of(cross, dim)) {
            assertEquals(400, r.getResponse().getStatus());
        }
        assertTrue(fieldsOf(body(cross)).contains("value.platformWidthM"), fieldsOf(body(cross)).toString());
        assertTrue(fieldsOf(body(dim)).contains("value[0].dimensions[0].min"), fieldsOf(body(dim)).toString());
        assertEquals(0, doc(id).get("revision").asInt());
    }

    @Test
    void put_unknownEnumValues_areRejectedWithTheKnownOnes() throws Exception {
        assertRejected(section("piers"), PIERS.replace("\"H_TYPE\"", "\"HEXAGON\""), 0L, "pierType", "value[0].pierType");
        assertRejected(section("pier-caps"), PIER_CAPS.replace("\"T_CAP\"", "\"X\""), 0L, "capType", "value[0].capType");
        assertRejected(section("pier-caps"), PIER_CAPS.replace("\"TWO_COLUMNS\"", "\"X\""), 0L,
                "compatiblePierConfiguration", "value[0].compatiblePierConfiguration");
        assertRejected(section("foundations"), FOUNDATIONS.replace("\"PILED\"", "\"X\""), 0L, "foundationType",
                "value[0].foundationType");
        assertRejected(section("bearings"), BEARINGS.replace("\"ELASTOMERIC\"", "\"X\""), 0L, "bearingType",
                "value[0].bearingType");
        assertRejected(section("bridge-definitions"), BRIDGE_DEFINITIONS.replace("\"ABUTMENT\"", "\"X\""), 0L,
                "axis type", "value.definitions[0].axes[0].type");
        assertRejected(section("bridge-definitions"), BRIDGE_DEFINITIONS.replace("\"RIVER\"", "\"X\""), 0L,
                "constraint kind", "value.definitions[0].constraints[0].kind");
    }

    @Test
    void put_enumMessage_listsTheAllowedConstants() throws Exception {
        String id = createProject();

        JsonNode b = body(put(id, section("piers"), envelope(0L, PIERS.replace("\"H_TYPE\"", "\"HEXAGON\""))));

        assertEquals("must be one of: RECTANGULAR, CIRCULAR, OVAL, BOX, H_SECTION, H_TYPE, WALL",
                b.get("errors").get(0).get("message").asText());
    }

    @Test
    void put_duplicateOrBlankIds_areRejected() throws Exception {
        assertRejected(section("piers"), PIERS.replace("\"id\":\"WALL-1\"", "\"id\":\"RECT-M\""), 0L, "duplicate family id",
                "value[1].id");
        assertRejected(section("piers"), PIERS.replace("\"id\":\"WALL-1\"", "\"id\":\" \""), 0L, "blank family id",
                "value[1].id");
        assertRejected(section("materials"), MATERIALS.replace("\"id\":\"BARE\"", "\"id\":\"FOUNDATION\""), 0L,
                "duplicate material id", "value[1].id");
        assertRejected(section("bridge-definitions"), BRIDGE_DEFINITIONS.replace("\"definitionKey\":\"b-2\"",
                "\"definitionKey\":\"b-1\""), 0L, "duplicate definition key", "value.definitions[1].definitionKey");
        assertRejected(section("bridge-definitions"), BRIDGE_DEFINITIONS
                .replace("\"axisAssignments\":[" + AXIS_ASSIGNMENT_P1 + "]",
                        "\"axisAssignments\":[" + AXIS_ASSIGNMENT_P1 + "," + AXIS_ASSIGNMENT_P1 + "]"), 0L,
                "duplicate axis assignment", "value.definitions[0].axisAssignments[1].axisId");
    }

    @Test
    void put_nullRequiredFields_areRejected() throws Exception {
        assertRejected(section("cross-section"), CROSS_SECTION.replace("\"numberOfGirders\":5.0", "\"numberOfGirders\":null"),
                0L, "cross section number", "value.numberOfGirders");
        assertRejected(section("preferred-span-rules"), PREFERRED_SPAN_RULES.replace("\"minSpan\":5.0", "\"minSpan\":null"),
                0L, "span rule number", "value[0].minSpan");
        assertRejected(section("piers"), PIERS.replace("\"label\":\"Transverse Length (m)\"", "\"label\":null"), 0L,
                "dimension label", "value[0].dimensions[0].label");
        assertRejected(section("bridge-definitions"), BRIDGE_DEFINITIONS.replace(
                "\"constructionMethod\":\"\",\"constructionStagesNote\":\"stages", "\"constructionMethod\":null,"
                        + "\"constructionStagesNote\":\"stages"), 0L, "construction method",
                "value.definitions[0].constructionMethod");
        assertRejected(section("foundations"), FOUNDATIONS.replace("\"height\":{\"min\":0.30000000000000004,\"max\":1.0,\"delta\":1.0}",
                "\"height\":null"), 0L, "generation rule", "value[1].shallowGeneration.height");
    }

    @Test
    void put_girderLibraryWithAnArray_isRejected() throws Exception {
        String id = createProject();

        MvcResult r = put(id, section("girder-library"), envelope(0L, "[]"));

        assertEquals(400, r.getResponse().getStatus());
        assertTrue(fieldsOf(body(r)).contains("value"), fieldsOf(body(r)).toString());
        assertEquals(0, doc(id).get("revision").asInt());
    }

    @Test
    void put_malformedJson_isMalformedRequestBody() throws Exception {
        String id = createProject();

        MvcResult broken = put(id, section("piers"), "{not json");

        assertEquals(400, broken.getResponse().getStatus());
        assertEquals("MALFORMED_REQUEST_BODY", body(broken).get("code").asText());
    }

    // ------------------------------------------------------------------ AC8: null / [] semantics

    @Test
    void newProject_hasEveryDesignSectionNull_andFamiliesAnObjectOfNulls() throws Exception {
        String id = createProject();

        JsonNode d = doc(id);

        assertEquals(List.of("projectId", "revision", "createdAt", "updatedAt", "workspace", "bridgeDefinitions",
                "families", "girderLibrary", "preferredSpanRules", "crossSection", "loads", "graphs"),
                StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(d.fieldNames(), 0), false).toList());
        assertTrue(d.get("bridgeDefinitions").isNull());
        assertTrue(d.get("girderLibrary").isNull());
        assertTrue(d.get("preferredSpanRules").isNull());
        assertTrue(d.get("crossSection").isNull());
        assertTrue(d.get("families").isObject());
        assertEquals(List.of("piers", "pierCaps", "foundations", "bearings", "materials"),
                StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(d.get("families").fieldNames(), 0),
                        false).toList());
        d.get("families").forEach(f -> assertTrue(f.isNull()));
    }

    @Test
    void create_responseCarriesTheNewKeysAsNull() throws Exception {
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
        assertTrue(created.has("bridgeDefinitions") && created.get("bridgeDefinitions").isNull());
        assertTrue(created.get("families").isObject());
        assertTrue(created.get("families").get("piers").isNull());
        assertTrue(created.has("girderLibrary") && created.get("girderLibrary").isNull());
        assertTrue(created.has("preferredSpanRules") && created.get("preferredSpanRules").isNull());
        assertTrue(created.has("crossSection") && created.get("crossSection").isNull());
    }

    @ParameterizedTest
    @MethodSource("requiredSections")
    void put_emptyList_readsBackEmpty_notNull(Section s) throws Exception {
        String id = createProject();
        String empty = emptyValue(s);

        written(put(id, s, envelope(0L, empty)));

        JsonNode stored = doc(id).at(s.pointer());
        assertFalse(stored.isNull() || stored.isMissingNode(), s.name());
        assertEquals(json.readTree(empty), stored);
    }

    @ParameterizedTest
    @MethodSource("clearableSections")
    void put_null_clearsTheSection_andRaisesTheRevision(Section s) throws Exception {
        String id = createProject();
        written(put(id, s, envelope(0L, s.value())));

        JsonNode cleared = written(put(id, s, envelope(1L, "null")));

        assertEquals(2, cleared.get("revision").asInt());
        assertTrue(cleared.get("value").isNull());
        assertTrue(doc(id).at(s.pointer()).isNull());
        assertEquals(2, doc(id).get("revision").asInt());
    }

    @Test
    void preferredSpanRules_emptyArrayAndNull_areDifferent() throws Exception {
        String id = createProject();
        Section s = section("preferred-span-rules");

        written(put(id, s, envelope(0L, "[]")));
        assertTrue(doc(id).get("preferredSpanRules").isArray());
        written(put(id, s, envelope(1L, "null")));
        assertTrue(doc(id).get("preferredSpanRules").isNull());
    }

    @Test
    void girderLibrary_nullFieldsRoundTrip() throws Exception {
        String id = createProject();
        Section s = section("girder-library");
        String value = "{\"enabled\":null,\"dimensions\":null}";

        JsonNode result = written(put(id, s, envelope(0L, value)));

        assertEquals(json.readTree(value), result.get("value"));
        assertEquals(json.readTree(value), doc(id).get("girderLibrary"));
        written(put(id, s, envelope(1L, "{\"enabled\":false,\"dimensions\":[]}")));
        assertEquals(json.readTree("{\"enabled\":false,\"dimensions\":[]}"), doc(id).get("girderLibrary"));
    }

    @Test
    void absentOptionalFamilyFields_comeBackAsExplicitNulls_andRuleObjectsStayObjects() throws Exception {
        String id = createProject();

        JsonNode piers = written(put(id, section("piers"), envelope(0L, "[{\"id\":\"only-id\"}]"))).get("value");
        JsonNode caps = written(put(id, section("pier-caps"), envelope(1L,
                "[{\"id\":\"c\",\"capTransverseLength\":{},\"stemWidth\":null}]"))).get("value");

        ObjectNode expectedPier = json.createObjectNode().put("id", "only-id");
        for (String f : List.of("name", "pierType", "enabled", "source", "dimensions", "allowedConfigurations",
                "twoColumnSpacing", "heightApplicability")) {
            expectedPier.putNull(f);
        }
        assertEquals(expectedPier, piers.get(0));
        assertTrue(caps.get(0).get("capTransverseLength").isObject());
        assertTrue(caps.get(0).get("capTransverseLength").get("min").isNull());
        assertTrue(caps.get(0).get("stemWidth").isNull());
        assertEquals(caps.get(0), doc(id).at("/families/pierCaps/0"));
    }

    // ------------------------------------------------------------------ AC9 / AC10

    @Test
    void workspacePut_leavesTheDesignSectionsAlone_andListSummaryShapeIsUnchanged() throws Exception {
        String id = createProject();
        written(put(id, section("piers"), envelope(0L, PIERS)));
        written(put(id, section("cross-section"), envelope(1L, CROSS_SECTION)));
        JsonNode ws = doc(id).get("workspace");

        MvcResult r = putPath(id, "/workspace", envelope(2L, ws.toString()));

        assertEquals(200, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        JsonNode after = doc(id);
        assertEquals(3, after.get("revision").asInt());
        assertEquals(json.readTree(PIERS), after.at("/families/piers"));
        assertEquals(json.readTree(CROSS_SECTION), after.get("crossSection"));
        JsonNode summary = null;
        for (JsonNode n : getOk("/api/projects")) {
            if (n.get("projectId").asText().equals(id)) {
                summary = n;
            }
        }
        assertEquals(List.of("projectId", "name", "revision", "createdAt", "updatedAt"),
                StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(summary.fieldNames(), 0), false).toList());
    }

    @Test
    void engineeringNonsense_isAcceptedAndStoredUnchanged() throws Exception {
        String id = createProject();

        written(put(id, section("preferred-span-rules"), envelope(0L, PREFERRED_SPAN_RULES)));
        written(put(id, section("pier-caps"), envelope(1L, PIER_CAPS)));
        written(put(id, section("bridge-definitions"), envelope(2L, BRIDGE_DEFINITIONS)));

        JsonNode d = doc(id);
        assertEquals(-1.0, d.at("/preferredSpanRules/0/maxSpan").asDouble());
        assertEquals(9.0, d.at("/families/pierCaps/0/capTransverseLength/min").asDouble());
        assertEquals(1.0, d.at("/families/pierCaps/0/capTransverseLength/max").asDouble());
        assertEquals("b-1", d.at("/bridgeDefinitions/definitions/0/definitionKey").asText());
        assertEquals("other-id", d.at("/bridgeDefinitions/definitions/0/bridgeId").asText());
        assertEquals(Double.doubleToLongBits(0.30000000000000004),
                Double.doubleToLongBits(d.at("/bridgeDefinitions/definitions/0/spanLengthsM/1").asDouble()));
    }

    // ------------------------------------------------------------------ CORS

    @Test
    void corsPreflight_forEveryDesignSystemPut_isAcceptedFromTheViteOrigin() throws Exception {
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
