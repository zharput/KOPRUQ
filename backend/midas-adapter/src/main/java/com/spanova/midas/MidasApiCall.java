package com.spanova.midas;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * One HTTP call to MIDAS's Open API, e.g.
 * {@code PUT /db/node {"Assign": {"1": {"X": 0, "Y": 0, "Z": 0}}}}.
 * Kept as a plain value so {@link MidasModelBuilder} stays pure/testable
 * - it returns a list of these instead of making HTTP calls itself.
 */
public record MidasApiCall(String method, String path, JsonNode body) {
}
