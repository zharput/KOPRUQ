package com.kopruq.shared.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kopruq.landxml.domain.LandXmlParseException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 2: one error contract for every failure. A test-only
 * controller throws each exception type so the mapping table in
 * {@link ApiExceptionHandler} is verified end to end through MockMvc.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ApiExceptionHandlerTest.Thrower.class)
class ApiExceptionHandlerTest {

    private static final List<String> BODY_KEYS = List.of(
            "timestamp", "status", "error", "code", "message", "path", "correlationId", "errors");

    @RestController
    @RequestMapping("/api/test-errors")
    static class Thrower {
        @GetMapping("/{kind}")
        public String throwIt(@PathVariable String kind, @RequestParam(required = false) Integer n) {
            switch (kind) {
                case "iae": throw new IllegalArgumentException("bad value 42");
                case "nfe": throw new NumberFormatException("For input string: \"x\"");
                case "landxml": throw new LandXmlParseException("Could not parse this LandXML file: boom");
                case "invalid": throw new InvalidRequestException(List.of(
                        new FieldViolation("deckWidthM", "must be greater than 0"),
                        new FieldViolation("spanLengthsM[1]", "is required")));
                case "rse404": throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No thing with id 7");
                case "rse409": throw new ResponseStatusException(HttpStatus.CONFLICT);
                case "upload": throw new MaxUploadSizeExceededException(1);
                case "io": throw new UncheckedIOException("Could not read it", new IOException("disk"));
                case "npe": throw new NullPointerException("secret internal detail at Foo.java:12");
                case "oom-like": throw new IllegalStateException("secret state detail");
                default: return "ok" + n;
            }
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    private MvcResult call(String kind) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.get("/api/test-errors/" + kind)).andReturn();
    }

    private JsonNode assertErrorBody(MvcResult result, int status, String code) throws Exception {
        assertEquals(status, result.getResponse().getStatus());
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        for (String key : BODY_KEYS) {
            assertTrue(body.has(key), "missing key " + key + " in " + body);
        }
        assertEquals(status, body.get("status").asInt());
        assertEquals(code, body.get("code").asText());
        assertEquals(HttpStatus.valueOf(status).getReasonPhrase(), body.get("error").asText());
        assertTrue(body.get("errors").isArray());
        assertTrue(body.get("path").asText().startsWith("/api/"));
        assertTrue(result.getResponse().getContentType().startsWith("application/json"));
        return body;
    }

    @Test
    void illegalArgument_is400InvalidInput_withMessageVerbatim() throws Exception {
        JsonNode body = assertErrorBody(call("iae"), 400, "INVALID_INPUT");
        assertEquals("bad value 42", body.get("message").asText());
        assertEquals(0, body.get("errors").size());
    }

    @Test
    void numberFormat_is400InvalidInput() throws Exception {
        assertErrorBody(call("nfe"), 400, "INVALID_INPUT");
    }

    @Test
    void landXmlParseException_is400InvalidLandxml() throws Exception {
        JsonNode body = assertErrorBody(call("landxml"), 400, "INVALID_LANDXML");
        assertEquals("Could not parse this LandXML file: boom", body.get("message").asText());
    }

    @Test
    void invalidRequest_is400_withFieldErrors() throws Exception {
        JsonNode body = assertErrorBody(call("invalid"), 400, "INVALID_REQUEST");
        assertEquals(2, body.get("errors").size());
        assertEquals("deckWidthM", body.get("errors").get(0).get("field").asText());
        assertEquals("must be greater than 0", body.get("errors").get(0).get("message").asText());
        assertEquals("spanLengthsM[1]", body.get("errors").get(1).get("field").asText());
    }

    @Test
    void responseStatusException_keepsStatusAndReasonVerbatim() throws Exception {
        JsonNode body = assertErrorBody(call("rse404"), 404, "NOT_FOUND");
        assertEquals("No thing with id 7", body.get("message").asText());
        JsonNode conflict = assertErrorBody(call("rse409"), 409, "CONFLICT");
        assertEquals("Conflict", conflict.get("message").asText());
    }

    @Test
    void uploadTooLarge_is413() throws Exception {
        assertErrorBody(call("upload"), 413, "UPLOAD_TOO_LARGE");
    }

    @Test
    void uncheckedIo_is400UploadUnreadable() throws Exception {
        JsonNode body = assertErrorBody(call("io"), 400, "UPLOAD_UNREADABLE");
        assertFalse(body.get("message").asText().contains("disk"));
    }

    @Test
    void unexpectedException_is500_withGenericMessage_neverTheExceptionText() throws Exception {
        for (String kind : new String[] {"npe", "oom-like"}) {
            MvcResult result = call(kind);
            JsonNode body = assertErrorBody(result, 500, "INTERNAL_ERROR");
            assertEquals("An internal error occurred.", body.get("message").asText());
            String raw = result.getResponse().getContentAsString();
            assertFalse(raw.contains("secret"), raw);
            assertFalse(raw.contains("Foo.java"), raw);
        }
    }

    @Test
    void springMvcExceptions_keepTheirOwnStatus() throws Exception {
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/nothing-here")).andReturn(), 404, "NOT_FOUND");
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.delete("/api/kernel-state")).andReturn(), 405, "METHOD_NOT_ALLOWED");
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.post("/api/kernel-state")
                .contentType("text/plain").content("x")).andReturn(), 415, "UNSUPPORTED_MEDIA_TYPE");
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/terrain/x/elevation")).andReturn(), 400, "BAD_REQUEST");
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/terrain/x/elevation?x=a&y=1")).andReturn(), 400, "INVALID_PARAMETER");
    }

    @Test
    void malformedJsonBody_is400() throws Exception {
        JsonNode body = assertErrorBody(mvc.perform(MockMvcRequestBuilders.post("/api/kernel-state")
                .contentType("application/json").content("{not json")).andReturn(), 400, "MALFORMED_REQUEST_BODY");
        assertFalse(body.get("message").asText().contains("Unexpected"));
    }

    @Test
    void missingMultipartFile_is400() throws Exception {
        assertErrorBody(mvc.perform(MockMvcRequestBuilders.multipart("/api/landxml/inspect")).andReturn(), 400, "BAD_REQUEST");
    }

    // ---- real endpoints

    @Test
    void malformedLandXml_isInvalidLandxml400_onInspectAndImport() throws Exception {
        byte[] bad = "<notxml".getBytes();
        MvcResult inspect = mvc.perform(MockMvcRequestBuilders.multipart("/api/landxml/inspect")
                .file(new MockMultipartFile("file", "x.landxml", "application/xml", bad))).andReturn();
        assertErrorBody(inspect, 400, "INVALID_LANDXML");

        MvcResult imp = mvc.perform(MockMvcRequestBuilders.multipart("/api/landxml/import")
                .file(new MockMultipartFile("file", "x.landxml", "application/xml", bad))
                .param("projectId", "p").param("coordinateSystemLabel", "L").param("surfaceName", "S")
                .param("coordinateOrder", "FIRST_Y_SECOND_X")).andReturn();
        JsonNode body = assertErrorBody(imp, 400, "INVALID_LANDXML");
        assertTrue(body.get("message").asText().startsWith("Could not parse this LandXML file"));
    }

    @Test
    void landXmlUnknownSurface_keepsTheOriginalMessageAs400() throws Exception {
        MvcResult imp = mvc.perform(MockMvcRequestBuilders.multipart("/api/landxml/import")
                .file(new MockMultipartFile("file", "x.landxml", "application/xml",
                        getClass().getResourceAsStream("/landxml/sample.landxml").readAllBytes()))
                .param("projectId", "p").param("coordinateSystemLabel", "L").param("surfaceName", "Nope")
                .param("coordinateOrder", "FIRST_Y_SECOND_X")).andReturn();
        JsonNode body = assertErrorBody(imp, 400, "INVALID_INPUT");
        assertEquals("No surface named \"Nope\" found in this file", body.get("message").asText());
    }

    @Test
    void restEndpointNotFound_keepsMessage_andBinaryEndpoint404IsStillJson() throws Exception {
        JsonNode body = assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/terrain/nope/mesh")).andReturn(), 404, "NOT_FOUND");
        assertEquals("No terrain with id nope", body.get("message").asText());
        JsonNode bin = assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/terrain/nope/mesh.bin")).andReturn(), 404, "NOT_FOUND");
        assertEquals("No terrain with id nope", bin.get("message").asText());
    }

    @Test
    void concreteMaterialUnknown_isStill404WithMessage() throws Exception {
        JsonNode body = assertErrorBody(mvc.perform(MockMvcRequestBuilders.get("/api/materials/concrete?materialId=C99/99")).andReturn(), 404, "NOT_FOUND");
        assertEquals("Unknown concrete material ID: C99/99", body.get("message").asText());
    }

    @Test
    void fastSolverPierCountMismatch_isNow400_notAn500() throws Exception {
        String body = "{\"spanLengthsM\":[30,40],\"deckWidthM\":15,\"deckThicknessM\":1,\"sdlKnPerM\":10,"
                + "\"pierHeightsM\":[10,15,20],\"columnLongitudinalM\":2,\"columnTransverseM\":4,\"columnSpacingTransverseM\":8,"
                + "\"capBeamWidthM\":3,\"capBeamDepthM\":1.5,\"concreteFckMpa\":30,\"bearingKx\":1,\"bearingKy\":1,\"bearingKz\":1,"
                + "\"bearingKrx\":1,\"bearingKry\":1,\"bearingKrz\":1}";
        MvcResult result = mvc.perform(MockMvcRequestBuilders.post("/api/fast-solver/solve")
                .contentType("application/json").content(body)).andReturn();
        JsonNode node = assertErrorBody(result, 400, "INVALID_REQUEST");
        assertEquals("pierHeightsM", node.get("errors").get(0).get("field").asText());
        assertTrue(node.get("message").asText().contains("pierHeightsM"));
    }

    @Test
    void layoutAndAlternativesIllegalArgument_areNow400() throws Exception {
        // minSpanM > maxSpanM is rejected by the domain with an IllegalArgumentException.
        String alt = "{\"bridgeName\":\"V\",\"totalLengthM\":210,\"deckWidthM\":13.8,\"minSpanM\":50,\"maxSpanM\":30,"
                + "\"minGirderCount\":4,\"maxGirderCount\":8,\"minGirderDepthM\":1.8,\"maxGirderDepthM\":2.5}";
        MvcResult result = mvc.perform(MockMvcRequestBuilders.post("/api/alternatives")
                .contentType("application/json").content(alt)).andReturn();
        assertErrorBody(result, 400, "INVALID_INPUT");

        String layout = "{\"alignmentLengthM\":300,\"siteStartChainageM\":250,\"siteEndChainageM\":50,\"crossingType\":\"RIVER\","
                + "\"noPierZones\":[],\"minSpanM\":30,\"maxSpanM\":50,\"minSpanCount\":3,\"maxSpanCount\":6,\"spanLengthStepM\":5,\"c1StepM\":10}";
        MvcResult layoutResult = mvc.perform(MockMvcRequestBuilders.post("/api/layout/generate")
                .contentType("application/json").content(layout)).andReturn();
        assertErrorBody(layoutResult, 400, "INVALID_INPUT");
    }

    @Test
    void actuatorHealth_isUnchanged() throws Exception {
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/actuator/health")).andReturn();
        assertEquals(200, result.getResponse().getStatus());
        assertTrue(result.getResponse().getContentAsString().contains("UP"));
    }
}
