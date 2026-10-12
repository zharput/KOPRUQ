package com.kopruq.api.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Shared MockMvc plumbing for the BACKEND-REMEDIATION characterization
 * ("contract") tests. All contract tests use the same Spring context
 * configuration so the context is created once and cached.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class ContractTestSupport {

    protected static final String FAST_SOLVER_BODY = "{\"spanLengthsM\":[30,40,50,40,25],\"deckWidthM\":15,\"deckThicknessM\":1,"
            + "\"sdlKnPerM\":10,\"pierHeightsM\":[10,15,20,8],\"columnLongitudinalM\":2,\"columnTransverseM\":4,"
            + "\"columnSpacingTransverseM\":8,\"capBeamWidthM\":3,\"capBeamDepthM\":1.5,\"concreteFckMpa\":30,"
            + "\"bearingKx\":3000,\"bearingKy\":30000,\"bearingKz\":100000,\"bearingKrx\":100000,\"bearingKry\":100000,\"bearingKrz\":100000}";

    protected static final String KERNEL_BODY = "{\"bridgeName\":\"VIA-35\",\"totalLengthM\":210,\"deckWidthM\":13.8,"
            + "\"minSpanM\":30,\"maxSpanM\":45,\"minGirderCount\":4,\"maxGirderCount\":8,\"minGirderDepthM\":1.8,\"maxGirderDepthM\":2.5}";

    protected static final String LAYOUT_BODY = "{\"alignmentLengthM\":300,\"siteStartChainageM\":50,\"siteEndChainageM\":250,"
            + "\"crossingType\":\"RIVER\",\"noPierZones\":[{\"id\":\"z1\",\"startChainageM\":100,\"endChainageM\":120,\"description\":\"d\"}],"
            + "\"minSpanM\":30,\"maxSpanM\":50,\"minSpanCount\":3,\"maxSpanCount\":6,\"spanLengthStepM\":5,\"c1StepM\":10}";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    protected MvcResult postJson(String url, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(url).contentType("application/json").content(body)).andReturn();
    }

    protected MvcResult get(String url) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.get(url)).andReturn();
    }

    protected JsonNode postJsonOk(String url, String body) throws Exception {
        MvcResult result = postJson(url, body);
        Assertions.assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return body(result);
    }

    protected JsonNode getOk(String url) throws Exception {
        MvcResult result = get(url);
        Assertions.assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return body(result);
    }

    protected JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    protected static byte[] sampleLandXml() throws IOException {
        try (InputStream in = ContractTestSupport.class.getResourceAsStream("/landxml/sample.landxml")) {
            if (in == null) {
                throw new IllegalStateException("landxml/sample.landxml fixture missing");
            }
            return in.readAllBytes();
        }
    }

    protected MvcResult uploadLandXml(String url, byte[] content, String... paramPairs) throws Exception {
        var builder = MockMvcRequestBuilders.multipart(url)
                .file(new MockMultipartFile("file", "sample.landxml", "application/xml", content));
        for (int i = 0; i < paramPairs.length; i += 2) {
            builder.param(paramPairs[i], paramPairs[i + 1]);
        }
        return mvc.perform(builder).andReturn();
    }

    protected MvcResult importSample(String alignmentName) throws Exception {
        if (alignmentName == null) {
            return uploadLandXml("/api/landxml/import", sampleLandXml(),
                    "projectId", "p1", "coordinateSystemLabel", "Local", "surfaceName", "Existing Ground",
                    "coordinateOrder", "FIRST_Y_SECOND_X");
        }
        return uploadLandXml("/api/landxml/import", sampleLandXml(),
                "projectId", "p1", "coordinateSystemLabel", "Local", "surfaceName", "Existing Ground",
                "coordinateOrder", "FIRST_Y_SECOND_X", "alignmentName", alignmentName);
    }

    protected MvcResult uploadXyz(String content) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.multipart("/api/terrain/import")
                .file(new MockMultipartFile("file", "points.xyz", "text/plain", content.getBytes(StandardCharsets.UTF_8)))
                .param("projectId", "p1").param("coordinateSystemLabel", "local")).andReturn();
    }

    /**
     * The client-visible error message of a response: the JSON {@code message}
     * field if the body is JSON, else the servlet error message (plain
     * {@code sendError}). Lets one assertion survive the error-contract change.
     */
    protected String messageOf(MvcResult result) throws Exception {
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        if (!content.isBlank() && content.trim().startsWith("{")) {
            JsonNode node = json.readTree(content);
            return node.hasNonNull("message") ? node.get("message").asText() : null;
        }
        return result.getResponse().getErrorMessage();
    }
}
