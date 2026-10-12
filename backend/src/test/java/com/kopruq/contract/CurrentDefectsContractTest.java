package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * BACKEND-REMEDIATION Faz 0b: documents CURRENT DEFECTS ("current_*" tests).
 * Each test pins today's behavior so the later phase that fixes it must
 * change the test on purpose. None of these assert desired behavior.
 */
class CurrentDefectsContractTest extends ContractTestSupport {

    /** Behavior kept by Faz 2: malformed LandXML in /inspect is 400. */
    @Test
    void landxmlInspectMalformed_is400() throws Exception {
        MvcResult r = uploadLandXml("/api/landxml/inspect", "<notxml".getBytes());
        assertEquals(400, r.getResponse().getStatus());
    }
}
