package com.kopruq.api.observability;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 3: correlation id in header, error body and server log. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(CorrelationIdFilterTest.Boom.class)
@ExtendWith(OutputCaptureExtension.class)
class CorrelationIdFilterTest {

    @RestController
    @RequestMapping("/api/test-observability")
    static class Boom {
        @GetMapping("/boom")
        public String boom() {
            throw new IllegalStateException("kaboom-internal-detail");
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Test
    void everyResponseCarriesAGeneratedId_whenNoneIsSent() throws Exception {
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/api/traffic-loads/load-groups")).andReturn();
        String id = result.getResponse().getHeader("X-Correlation-ID");
        assertTrue(id != null && !id.isBlank());
        UUID.fromString(id);
    }

    @Test
    void aSafeIncomingIdIsEchoed() throws Exception {
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/api/traffic-loads/load-groups")
                .header("X-Correlation-ID", "client-req-123")).andReturn();
        assertEquals("client-req-123", result.getResponse().getHeader("X-Correlation-ID"));
    }

    @Test
    void anUnsafeIncomingIdIsReplaced() throws Exception {
        for (String bad : new String[] {"has space", "semi;colon", "a".repeat(65), "inj%0AECT", "tab\tchar", "evil{x}"}) {
            MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/api/traffic-loads/load-groups")
                    .header("X-Correlation-ID", bad)).andReturn();
            String id = result.getResponse().getHeader("X-Correlation-ID");
            assertNotEquals(bad, id, bad);
            UUID.fromString(id);
        }
    }

    @Test
    void errorBodyCorrelationId_equalsTheHeader_for4xx() throws Exception {
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/api/terrain/nope/mesh")
                .header("X-Correlation-ID", "abc-404")).andReturn();
        assertEquals(404, result.getResponse().getStatus());
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        assertEquals("abc-404", body.get("correlationId").asText());
        assertEquals("abc-404", result.getResponse().getHeader("X-Correlation-ID"));
    }

    @Test
    void fiveHundred_isLoggedWithStackTraceAndCorrelationId_andBodyHasNoInternalText(CapturedOutput output) throws Exception {
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/api/test-observability/boom")
                .header("X-Correlation-ID", "trace-me-500")).andReturn();

        assertEquals(500, result.getResponse().getStatus());
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        assertEquals("trace-me-500", body.get("correlationId").asText());
        assertFalse(result.getResponse().getContentAsString().contains("kaboom"));

        String log = output.getAll();
        assertTrue(log.contains("[trace-me-500]"), "log lines must carry the correlation id");
        assertTrue(log.contains("java.lang.IllegalStateException: kaboom-internal-detail"));
        assertTrue(log.contains("at com.kopruq.api.observability.CorrelationIdFilterTest$Boom.boom"),
                "the stack trace must be logged");
    }

    @Test
    void clientErrors_areLoggedAtInfo_andCarryTheId(CapturedOutput output) throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/api/terrain/gone/mesh").header("X-Correlation-ID", "quiet-404")).andReturn();
        String log = output.getAll();
        assertTrue(log.contains("[quiet-404]"));
        assertTrue(log.contains("rejected with 404"));
    }
}
