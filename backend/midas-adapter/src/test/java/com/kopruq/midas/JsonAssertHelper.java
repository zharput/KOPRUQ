package com.kopruq.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Test-only helper: structural JSON comparison (field order doesn't matter, numeric value does). */
final class JsonAssertHelper {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonAssertHelper() {
    }

    static void assertJson(MidasApiCall call, String expectedJson) {
        try {
            JsonNode expected = MAPPER.readTree(expectedJson);
            assertEquals(expected, call.body());
        } catch (Exception e) {
            throw new AssertionError("Invalid expected JSON fixture: " + expectedJson, e);
        }
    }
}
