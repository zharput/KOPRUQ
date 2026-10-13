package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * backend-db-persistence M1: the four project endpoints. The test database is shared and committed by the contract
 * tests, so every test looks only at the projects it created itself.
 */
class ProjectApiContractTest extends ContractTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    // ------------------------------------------------------------------ fixtures

    private ObjectNode workspaceJson(String name, String... rowIds) throws Exception {
        ObjectNode ws = (ObjectNode) json.readTree("""
                {
                  "project": {
                    "name": "", "id": "PRJ-01", "client": "C", "designer": "D", "country": "TR", "region": "R",
                    "projectType": "Viaduct", "status": "Draft", "startDate": "", "targetDate": "", "description": "A çğıöşü €",
                    "locationStart": "", "locationEnd": "", "coordinateSystem": "", "designStandardFamily": "",
                    "concreteCode": "", "steelCode": "", "compositeCode": "", "seismicCode": "", "geotechnicalCode": "",
                    "trafficLoadStandard": "",
                    "units": {"length": "m", "force": "kN", "moment": "kNm", "stress": "MPa", "mass": "t", "temperature": "C"},
                    "coordinate": {"name": "", "epsg": "", "horizontalDatum": "", "verticalDatum": "", "originX": "", "originY": "", "originZ": "", "northAngle": ""},
                    "criteria": {"designLife": "", "reliabilityClass": "", "exposure": "", "concreteClass": "", "cover": "", "philosophy": ""},
                    "environment": {"terrainDatasetId": null, "landXmlImportId": null},
                    "lastModified": ""
                  },
                  "bridges": []
                }
                """);
        ((ObjectNode) ws.get("project")).put("name", name);
        ArrayNode bridges = (ArrayNode) ws.get("bridges");
        for (String id : rowIds) {
            bridges.add(row(id));
        }
        return ws;
    }

    private ObjectNode row(String id) throws Exception {
        return (ObjectNode) json.readTree("""
                {"id": "%s", "no": "VIA-02", "km": "14+170.000", "crossingType": "Valley", "estimatedLengthM": 205.0,
                 "roadWidthM": 13.8, "terrain": "-", "status": "-", "bridgeType": "Precast Girder",
                 "spansM": [30.0, 35.0, 40.0], "girderDepthCm": [160.0, 190.0], "girderNote": null, "pierShape": "Circular"}
                """.formatted(id));
    }

    private ObjectNode create(ObjectNode workspace) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.set("workspace", workspace);
        MvcResult r = postJson("/api/projects", body.toString());
        assertEquals(201, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        return (ObjectNode) body(r);
    }

    private ObjectNode putBody(Long expectedRevision, ObjectNode value) {
        ObjectNode body = json.createObjectNode();
        if (expectedRevision != null) {
            body.put("expectedRevision", expectedRevision);
        }
        body.set("value", value);
        return body;
    }

    private MvcResult put(String projectId, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.put("/api/projects/" + projectId + "/workspace")
                .contentType("application/json").content(body.getBytes(StandardCharsets.UTF_8))).andReturn();
    }

    private Map<String, Object> dbState(String projectId) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.putAll(jdbc.queryForMap("select revision, updated_utc, project_name from project where id = ?",
                java.util.UUID.fromString(projectId)));
        state.put("info", jdbc.queryForList("select * from project_info where project_id = ?",
                java.util.UUID.fromString(projectId)));
        state.put("rows", jdbc.queryForList("select row_id, ordinal, estimated_length_m from project_bridge_row "
                + "where project_id = ? order by ordinal", java.util.UUID.fromString(projectId)));
        return state;
    }

    private int projectCount() {
        return jdbc.queryForObject("select count(*) from project", Integer.class);
    }

    private static List<String> fieldsOf(JsonNode errorBody) {
        List<String> fields = new ArrayList<>();
        errorBody.get("errors").forEach(e -> fields.add(e.get("field").asText()));
        return fields;
    }

    // ------------------------------------------------------------------ create / read / list

    @Test
    void create_returns201WithLocation_andTheWorkspaceUnchanged() throws Exception {
        ObjectNode ws = workspaceJson("Koridor Ç", "b-1", "b-2");
        ((ObjectNode) ws.get("bridges").get(1)).putNull("girderDepthCm").put("girderNote", "note")
                .set("spansM", json.createArrayNode());

        ObjectNode body = json.createObjectNode();
        body.set("workspace", ws);
        MvcResult r = postJson("/api/projects", body.toString());
        JsonNode created = body(r);
        String id = created.get("projectId").asText();

        assertEquals(201, r.getResponse().getStatus());
        assertEquals("/api/projects/" + id, r.getResponse().getHeader("Location"));
        assertEquals(0, created.get("revision").asInt());
        assertEquals(created.get("createdAt"), created.get("updatedAt"));
        assertEquals(ws, created.get("workspace"));
        assertTrue(created.get("createdAt").asText().endsWith("Z"), "ISO-8601 instant");

        JsonNode fetched = getOk("/api/projects/" + id);
        assertEquals(ws, fetched.get("workspace"));
        assertEquals(0, fetched.get("revision").asInt());
        assertEquals(List.of("projectId", "revision", "createdAt", "updatedAt", "workspace", "bridgeDefinitions",
                "families", "girderLibrary", "preferredSpanRules", "crossSection"),
                StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(fetched.fieldNames(), 0), false).toList());

        assertEquals("Koridor Ç", jdbc.queryForObject("select project_name from project where id = ?",
                String.class, java.util.UUID.fromString(id)));
        assertEquals("PRJ-01", jdbc.queryForObject("select project_code from project_info where project_id = ?",
                String.class, java.util.UUID.fromString(id)));
    }

    @Test
    void list_isNewestChangeFirst_andShowsRenames() throws Exception {
        String first = create(workspaceJson("first")).get("projectId").asText();
        Thread.sleep(5);
        String second = create(workspaceJson("second")).get("projectId").asText();

        List<String> order = new ArrayList<>();
        getOk("/api/projects").forEach(n -> order.add(n.get("projectId").asText()));
        assertTrue(order.indexOf(second) < order.indexOf(first), "second was created later");

        Thread.sleep(5);
        assertEquals(200, put(first, putBody(0L, workspaceJson("first renamed")).toString()).getResponse().getStatus());

        order.clear();
        Map<String, String> names = new LinkedHashMap<>();
        getOk("/api/projects").forEach(n -> {
            order.add(n.get("projectId").asText());
            names.put(n.get("projectId").asText(), n.get("name").asText());
        });
        assertTrue(order.indexOf(first) < order.indexOf(second), "the updated project comes first");
        assertEquals("first renamed", names.get(first));
        JsonNode entry = getOk("/api/projects").get(order.indexOf(first));
        assertEquals(List.of("projectId", "name", "revision", "createdAt", "updatedAt"),
                StreamSupport.stream(java.util.Spliterators.spliteratorUnknownSize(entry.fieldNames(), 0), false).toList());
        assertEquals(1, entry.get("revision").asInt());
    }

    // ------------------------------------------------------------------ not found / bad id

    @Test
    void unknownProject_is404ProjectNotFound_forGetAndPut() throws Exception {
        String id = "7b0f8f0e-1111-4222-8333-444455556666";

        MvcResult get = get("/api/projects/" + id);
        MvcResult put = put(id, putBody(0L, workspaceJson("p")).toString());

        for (MvcResult r : List.of(get, put)) {
            assertEquals(404, r.getResponse().getStatus());
            JsonNode b = body(r);
            assertEquals("PROJECT_NOT_FOUND", b.get("code").asText());
            assertEquals(404, b.get("status").asInt());
            assertTrue(b.get("errors").isArray());
        }
    }

    @Test
    void nonUuidPath_is400InvalidParameter() throws Exception {
        MvcResult get = get("/api/projects/not-a-uuid");
        MvcResult put = put("not-a-uuid", putBody(0L, workspaceJson("p")).toString());

        for (MvcResult r : List.of(get, put)) {
            assertEquals(400, r.getResponse().getStatus());
            assertEquals("INVALID_PARAMETER", body(r).get("code").asText());
        }
    }

    // ------------------------------------------------------------------ replace

    @Test
    void put_withCurrentRevision_replacesTheWorkspace_rowOrderAddRemoveAndSwap() throws Exception {
        String id = create(workspaceJson("p", "a", "b", "c")).get("projectId").asText();

        ObjectNode next = workspaceJson("p", "c", "a", "d");
        MvcResult r = put(id, putBody(0L, next).toString());
        JsonNode written = body(r);

        assertEquals(200, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        assertEquals(id, written.get("projectId").asText());
        assertEquals(1, written.get("revision").asInt());
        assertEquals(next, written.get("value"));
        JsonNode fetched = getOk("/api/projects/" + id);
        assertEquals(next, fetched.get("workspace"));
        assertEquals(1, fetched.get("revision").asInt());
        assertEquals(written.get("updatedAt"), fetched.get("updatedAt"));
        assertNotEquals(fetched.get("createdAt"), fetched.get("updatedAt"));

        ObjectNode swapped = workspaceJson("p", "d", "c", "a");
        assertEquals(200, put(id, putBody(1L, swapped).toString()).getResponse().getStatus());
        assertEquals(swapped, getOk("/api/projects/" + id).get("workspace"));
    }

    @Test
    void put_withStaleRevision_is409_andChangesNothing() throws Exception {
        String id = create(workspaceJson("p", "a")).get("projectId").asText();
        assertEquals(200, put(id, putBody(0L, workspaceJson("p", "a", "b")).toString()).getResponse().getStatus());
        Map<String, Object> before = dbState(id);
        JsonNode beforeDoc = getOk("/api/projects/" + id);

        MvcResult r = put(id, putBody(0L, workspaceJson("changed", "z")).toString());

        assertEquals(409, r.getResponse().getStatus());
        JsonNode b = body(r);
        assertEquals("PROJECT_REVISION_CONFLICT", b.get("code").asText());
        assertTrue(b.get("message").asText().contains("0") && b.get("message").asText().contains("1"));
        assertEquals(before, dbState(id));
        assertEquals(beforeDoc, getOk("/api/projects/" + id));
    }

    @Test
    void sameRevisionTwice_firstIs200_secondIs409() throws Exception {
        String id = create(workspaceJson("p")).get("projectId").asText();

        assertEquals(200, put(id, putBody(0L, workspaceJson("one")).toString()).getResponse().getStatus());
        assertEquals(409, put(id, putBody(0L, workspaceJson("two")).toString()).getResponse().getStatus());
        assertEquals("one", getOk("/api/projects/" + id).get("workspace").get("project").get("name").asText());
    }

    // ------------------------------------------------------------------ validation

    private void assertPutRejected(String message, Long expectedRevision, Consumer<ObjectNode> mutate,
            String... expectedFields) throws Exception {
        String id = create(workspaceJson("p", "a", "b")).get("projectId").asText();
        Map<String, Object> before = dbState(id);
        ObjectNode value = workspaceJson("p", "a", "b");
        mutate.accept(value);

        MvcResult r = put(id, putBody(expectedRevision, value).toString());

        assertEquals(400, r.getResponse().getStatus(), message + ": " + r.getResponse().getContentAsString());
        JsonNode b = body(r);
        assertEquals("INVALID_REQUEST", b.get("code").asText(), message);
        for (String field : expectedFields) {
            assertTrue(fieldsOf(b).contains(field), message + ": expected " + field + " in " + fieldsOf(b));
        }
        assertEquals(before, dbState(id), message + ": database unchanged");
    }

    @Test
    void put_missingExpectedRevision_is400() throws Exception {
        assertPutRejected("missing revision", null, v -> { }, "expectedRevision");
    }

    @Test
    void put_nonFiniteNumbers_areRejectedWithTheirPaths() throws Exception {
        assertPutRejected("NaN length", 0L, v -> ((ObjectNode) v.get("bridges").get(0)).put("estimatedLengthM", "NaN"),
                "value.bridges[0].estimatedLengthM");
        assertPutRejected("overflow span", 0L, v -> {
            ObjectNode r0 = (ObjectNode) v.get("bridges").get(0);
            ArrayNode spans = r0.putArray("spansM");
            spans.add(30.0);
            spans.add(Double.POSITIVE_INFINITY);
        }, "value.bridges[0].spansM[1]");
    }

    @Test
    void put_overflowingNumberInRawJson_isRejected() throws Exception {
        String id = create(workspaceJson("p", "a")).get("projectId").asText();
        String raw = putBody(0L, workspaceJson("p", "a")).toString().replace("\"estimatedLengthM\":205.0",
                "\"estimatedLengthM\":1e999");
        assertTrue(raw.contains("1e999"));

        MvcResult r = put(id, raw);

        assertEquals(400, r.getResponse().getStatus());
        assertTrue(fieldsOf(body(r)).contains("value.bridges[0].estimatedLengthM") || "MALFORMED_REQUEST_BODY".equals(body(r).get("code").asText()));
    }

    @Test
    void put_duplicateRowIds_areRejected() throws Exception {
        assertPutRejected("duplicate id", 0L, v -> ((ObjectNode) v.get("bridges").get(1)).put("id", "a"),
                "value.bridges[1].id");
    }

    @Test
    void put_blankRowId_isRejected() throws Exception {
        assertPutRejected("blank id", 0L, v -> ((ObjectNode) v.get("bridges").get(0)).put("id", " "),
                "value.bridges[0].id");
    }

    @Test
    void put_unknownBridgeTypeAndPierShape_areRejected() throws Exception {
        assertPutRejected("labels", 0L, v -> {
            ((ObjectNode) v.get("bridges").get(0)).put("bridgeType", "Suspension");
            ((ObjectNode) v.get("bridges").get(1)).put("pierShape", "Hexagon");
        }, "value.bridges[0].bridgeType", "value.bridges[1].pierShape");
    }

    @Test
    void put_missingRequiredString_isRejected() throws Exception {
        assertPutRejected("missing unit", 0L, v -> ((ObjectNode) v.get("project").get("units")).remove("length"),
                "value.project.units.length");
    }

    @Test
    void put_unknownFields_areRejectedWithTheirPaths() throws Exception {
        assertPutRejected("unknown row field", 0L, v -> ((ObjectNode) v.get("bridges").get(0)).put("foo", 1),
                "value.bridges[0].foo");
        assertPutRejected("unknown value field", 0L, v -> v.put("extra", 1), "value.extra");
    }

    @Test
    void put_unknownFieldMessage_saysItIsNotAKnownField() throws Exception {
        String id = create(workspaceJson("p", "a")).get("projectId").asText();
        ObjectNode value = workspaceJson("p", "a");
        value.put("extra", true);

        JsonNode b = body(put(id, putBody(0L, value).toString()));

        assertEquals("is not a known field", b.get("errors").get(0).get("message").asText());
    }

    @Test
    void put_malformedJsonOrEmptyBody_isMalformedRequestBody() throws Exception {
        String id = create(workspaceJson("p")).get("projectId").asText();

        MvcResult broken = put(id, "{not json");
        MvcResult empty = put(id, "");

        assertEquals(400, broken.getResponse().getStatus());
        assertEquals("MALFORMED_REQUEST_BODY", body(broken).get("code").asText());
        assertEquals(400, empty.getResponse().getStatus());
    }

    @Test
    void invalidCreate_createsNoProject_andUsesTheWorkspacePrefix() throws Exception {
        int before = projectCount();
        ObjectNode ws = workspaceJson("p", "a", "a");
        ObjectNode body = json.createObjectNode();
        body.set("workspace", ws);

        MvcResult dup = postJson("/api/projects", body.toString());
        ObjectNode extra = json.createObjectNode();
        extra.set("workspace", workspaceJson("p"));
        extra.put("surprise", 1);
        MvcResult unknown = postJson("/api/projects", extra.toString());
        MvcResult nothing = postJson("/api/projects", "{}");

        assertEquals(400, dup.getResponse().getStatus());
        assertTrue(fieldsOf(body(dup)).contains("workspace.bridges[1].id"));
        assertEquals(400, unknown.getResponse().getStatus());
        assertEquals(List.of("surprise"), fieldsOf(body(unknown)));
        assertEquals(400, nothing.getResponse().getStatus());
        assertEquals(List.of("workspace"), fieldsOf(body(nothing)));
        assertEquals(before, projectCount());
    }

    // ------------------------------------------------------------------ CORS

    @Test
    void corsPreflight_forPut_isAcceptedFromTheViteOrigin_only() throws Exception {
        String url = "/api/projects/7b0f8f0e-1111-4222-8333-444455556666/workspace";

        MvcResult ok = mvc.perform(MockMvcRequestBuilders.options(url)
                .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "PUT")).andReturn();
        MvcResult otherOrigin = mvc.perform(MockMvcRequestBuilders.options(url)
                .header("Origin", "http://evil.example").header("Access-Control-Request-Method", "PUT")).andReturn();
        MvcResult delete = mvc.perform(MockMvcRequestBuilders.options(url)
                .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "DELETE")).andReturn();

        assertEquals(200, ok.getResponse().getStatus());
        assertEquals("GET,POST,PUT,HEAD", ok.getResponse().getHeader("Access-Control-Allow-Methods"));
        assertEquals(403, otherOrigin.getResponse().getStatus());
        assertEquals(403, delete.getResponse().getStatus());
    }
}
