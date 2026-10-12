package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 0b: layout, alternatives, kernel-state and CORS preflight. */
class LayoutKernelCorsContractTest extends ContractTestSupport {

    @Test
    void kernelState_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/kernel-state", KERNEL_BODY);
        assertEquals("VIA-35", n.get("bridge").get("bridgeName").asText());
        assertEquals(210.0, n.get("bridge").get("totalLengthM").asDouble(), 0);
        assertEquals(13.8, n.get("bridge").get("deckWidthM").asDouble(), 0);
        assertEquals(30.0, n.get("designSpace").get("minSpanM").asDouble(), 0);
        assertEquals(8, n.get("designSpace").get("maxGirderCount").asInt());
        assertEquals(0.1, n.get("designSpace").get("girderDepthStepM").asDouble(), 0);
    }

    @Test
    void alternatives_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/alternatives", KERNEL_BODY);
        assertEquals(3 * 5 * 8, n.size());
        JsonNode first = n.get(0);
        assertEquals(5, first.get("spanCount").asInt());
        assertEquals(42.0, first.get("spanLengthM").asDouble(), 1e-9);
        assertEquals(210.0, first.get("totalLengthM").asDouble(), 1e-9);
        assertEquals(4, first.get("girderCount").asInt());
        assertEquals(1.8, first.get("girderDepthM").asDouble(), 1e-9);
        assertTrue(first.get("feasible").asBoolean());
    }

    @Test
    void layoutGenerate_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/layout/generate", LAYOUT_BODY);
        assertEquals(82, n.size());
        JsonNode l1 = n.get(0);
        assertEquals("LAYOUT-1", l1.get("id").asText());
        assertEquals(50.0, l1.get("c1ChainageM").asDouble(), 1e-9);
        assertEquals(140.0, l1.get("c2ChainageM").asDouble(), 1e-9);
        assertEquals(3, l1.get("spanCount").asInt());
        assertFalse(l1.get("feasible").asBoolean());
        assertEquals("Inside no-pier zone z1",
                l1.get("piers").get(1).get("rejectionReasons").get(0).asText());
        JsonNode l3 = n.get(2);
        assertEquals(170.0, l3.get("c2ChainageM").asDouble(), 1e-9);
        assertTrue(l3.get("feasible").asBoolean());
        JsonNode last = n.get(81);
        assertEquals("LAYOUT-82", last.get("id").asText());
        assertEquals(160.0, last.get("c1ChainageM").asDouble(), 1e-9);
        assertEquals(250.0, last.get("c2ChainageM").asDouble(), 1e-9);
    }

    // ---- Faz 6 (was current_kernelStateMissingFields_becomesZeros): missing/non-finite numeric fields are a 400 with a field list.

    private java.util.Set<String> fieldsOf(String url, String body) throws Exception {
        MvcResult r = postJson(url, body);
        assertEquals(400, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        JsonNode n = body(r);
        assertEquals("INVALID_REQUEST", n.get("code").asText());
        var set = new java.util.TreeSet<String>();
        n.get("errors").forEach(e -> set.add(e.get("field").asText()));
        return set;
    }

    @Test
    void kernelStateAndAlternatives_missingFields_are400WithFieldList() throws Exception {
        var all = java.util.Set.of("deckWidthM", "maxGirderCount", "maxGirderDepthM", "maxSpanM", "minGirderCount",
                "minGirderDepthM", "minSpanM", "totalLengthM");
        assertEquals(all, fieldsOf("/api/kernel-state", "{\"bridgeName\":\"V\"}"));
        assertEquals(all, fieldsOf("/api/alternatives", "{}"));
        assertEquals(java.util.Set.of("minSpanM"), fieldsOf("/api/kernel-state",
                KERNEL_BODY.replace("\"minSpanM\":30", "\"minSpanM\":\"NaN\"")));
        assertEquals(java.util.Set.of("minGirderCount"), fieldsOf("/api/alternatives",
                KERNEL_BODY.replace("\"minGirderCount\":4", "\"minGirderCount\":null")));
    }

    @Test
    void layoutGenerate_missingFields_zoneFields_and_nonFinite_are400() throws Exception {
        assertEquals(java.util.Set.of("alignmentLengthM", "siteStartChainageM", "siteEndChainageM", "minSpanM", "maxSpanM",
                "minSpanCount", "maxSpanCount", "spanLengthStepM", "c1StepM"), fieldsOf("/api/layout/generate", "{}"));
        assertEquals(java.util.Set.of("noPierZones[0].endChainageM"), fieldsOf("/api/layout/generate",
                LAYOUT_BODY.replace("\"endChainageM\":120", "\"endChainageM\":null")));
        assertEquals(java.util.Set.of("c1StepM"), fieldsOf("/api/layout/generate",
                LAYOUT_BODY.replace("\"c1StepM\":10", "\"c1StepM\":\"Infinity\"")));
    }

    @Test
    void layoutGenerate_inconsistentSite_isAnIllegalArgument400_butATinyStepIsRejectedNotLooped() throws Exception {
        MvcResult r = postJson("/api/layout/generate", LAYOUT_BODY.replace("\"c1StepM\":10", "\"c1StepM\":1e-300"));
        assertEquals(400, r.getResponse().getStatus());
        assertEquals("INVALID_INPUT", body(r).get("code").asText());
    }

    @Test
    void alignmentSample_missingOrNonFiniteField_is400WithFieldList() throws Exception {
        assertEquals(java.util.Set.of("startXM", "startYM", "endXM", "endYM", "stepM"),
                fieldsOf("/api/alignment/sample", "{}"));
        assertEquals(java.util.Set.of("endXM"), fieldsOf("/api/alignment/sample",
                "{\"startXM\":0,\"startYM\":0,\"endXM\":\"NaN\",\"endYM\":0,\"stepM\":25}"));
    }

    @Test
    void alternatives_integerLimitInputs_terminateWith400() throws Exception {
        String body = KERNEL_BODY.replace("\"totalLengthM\":210", "\"totalLengthM\":1e300");
        MvcResult r = postJson("/api/alternatives", body);
        assertEquals(400, r.getResponse().getStatus());
        assertTrue(body(r).get("message").asText().contains("cannot be represented"));
    }

    @Test
    void corsPreflight_fromViteOrigin_isAccepted_otherOriginRejected() throws Exception {
        MvcResult ok = mvc.perform(MockMvcRequestBuilders.options("/api/kernel-state")
                .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "POST")).andReturn();
        assertEquals(200, ok.getResponse().getStatus());
        assertEquals("http://localhost:5173", ok.getResponse().getHeader("Access-Control-Allow-Origin"));
        // Faz 10: the central policy lists the configured methods (the per-controller annotation echoed only the asked one).
        assertEquals("GET,POST,HEAD", ok.getResponse().getHeader("Access-Control-Allow-Methods"));

        MvcResult bad = mvc.perform(MockMvcRequestBuilders.options("/api/kernel-state")
                .header("Origin", "http://evil.example").header("Access-Control-Request-Method", "POST")).andReturn();
        assertEquals(403, bad.getResponse().getStatus());
        assertNull(bad.getResponse().getHeader("Access-Control-Allow-Origin"));
    }

    @Test
    void simpleCrossOriginRequest_exposesTheCorrelationIdHeader_andOtherOriginsGetNoCorsHeaders() throws Exception {
        MvcResult ok = mvc.perform(MockMvcRequestBuilders.get("/api/traffic-loads/load-groups")
                .header("Origin", "http://localhost:5173")).andReturn();
        assertEquals(200, ok.getResponse().getStatus());
        assertEquals("http://localhost:5173", ok.getResponse().getHeader("Access-Control-Allow-Origin"));
        assertEquals("X-Correlation-ID", ok.getResponse().getHeader("Access-Control-Expose-Headers"));

        MvcResult bad = mvc.perform(MockMvcRequestBuilders.get("/api/traffic-loads/load-groups")
                .header("Origin", "http://evil.example")).andReturn();
        assertEquals(403, bad.getResponse().getStatus());
        assertNull(bad.getResponse().getHeader("Access-Control-Allow-Origin"));
    }

    @Test
    void corsPreflight_forAMethodOutsideGetPostHead_isRejected() throws Exception {
        MvcResult r = mvc.perform(MockMvcRequestBuilders.options("/api/kernel-state")
                .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "DELETE")).andReturn();
        assertEquals(403, r.getResponse().getStatus());
    }

    @Test
    void corsPreflight_coversEveryControllerFamily() throws Exception {
        String[][] cases = {
                {"/api/fast-solver/solve", "POST"}, {"/api/layout/generate", "POST"}, {"/api/alternatives", "POST"},
                {"/api/seismic/spectrum", "POST"}, {"/api/wind-loads/resolve", "POST"},
                {"/api/temperature/uniform/resolve", "POST"}, {"/api/traffic-loads/resolve", "POST"},
                {"/api/traffic-loads/lm1-defaults", "GET"}, {"/api/materials/concrete", "GET"},
                {"/api/terrain/import", "POST"}, {"/api/terrain/x/mesh", "GET"},
                {"/api/landxml/import", "POST"}, {"/api/alignment/sample", "POST"}};
        for (String[] c : cases) {
            MvcResult r = mvc.perform(MockMvcRequestBuilders.options(c[0])
                    .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", c[1])).andReturn();
            assertEquals(200, r.getResponse().getStatus(), c[0]);
            assertEquals("http://localhost:5173", r.getResponse().getHeader("Access-Control-Allow-Origin"), c[0]);
        }
    }
}
