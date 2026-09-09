package com.spanova.midas;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * The transport seam {@link MidasCivilNxAnalysisEngine} depends on -
 * lets tests substitute a fake in place of {@link MidasApiClient}'s real
 * network calls without a mocking framework.
 */
public interface MidasHttpClient {

    JsonNode call(String method, String path, JsonNode body);
}
