package com.kopruq.analysis.infra.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kopruq.analysis.model.DisplacementResult;
import com.kopruq.analysis.model.ReactionResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds MIDAS {@code POST /post/table} requests and parses their
 * responses - the result-extraction half of the round trip. Pure (no
 * network), so it is unit-testable against a fixed response fixture.
 *
 * <p>Request/response shapes verified live 2026-09-09 (spec section 20's
 * MIDAS-P01): {@code TABLE_TYPE "REACTIONG"} / {@code "DISPLACEMENTG"},
 * {@code LOAD_CASE_NAMES} suffixed {@code "(ST)"} for a static load
 * case. Response {@code HEAD}/{@code DATA} column order below matches
 * the engineer's own live MIDAS Civil NX response exactly - see
 * {@code MidasResultExtractorTest} for the captured fixture.
 */
public final class MidasResultExtractor {

    private static final String REACTIONS_TABLE_NAME = "Reactions";
    private static final String DISPLACEMENTS_TABLE_NAME = "Displacements";

    private static final List<String> REACTIONS_HEAD = List.of("Index", "Node", "Load", "FX", "FY", "FZ", "MX", "MY", "MZ");
    private static final List<String> DISPLACEMENTS_HEAD = List.of("Index", "Node", "Load", "DX", "DY", "DZ", "RX", "RY", "RZ");

    private final ObjectMapper mapper = new ObjectMapper();

    public MidasApiCall reactionsRequest(String loadCaseName) {
        return tableRequest(REACTIONS_TABLE_NAME, "REACTIONG", loadCaseName);
    }

    public MidasApiCall displacementsRequest(String loadCaseName) {
        return tableRequest(DISPLACEMENTS_TABLE_NAME, "DISPLACEMENTG", loadCaseName);
    }

    private MidasApiCall tableRequest(String tableName, String tableType, String loadCaseName) {
        ObjectNode argument = mapper.createObjectNode();
        argument.put("TABLE_NAME", tableName);
        argument.put("TABLE_TYPE", tableType);
        var loadCaseNames = argument.putArray("LOAD_CASE_NAMES");
        loadCaseNames.add(loadCaseName + "(ST)"); // "(ST)" = static load case, per the JSON Manual's Load Name & Type convention
        ObjectNode wrapper = mapper.createObjectNode();
        wrapper.set("Argument", argument);
        return new MidasApiCall("POST", "/post/table", wrapper);
    }

    /** HEAD: ["Index", "Node", "Load", "FX", "FY", "FZ", "MX", "MY", "MZ"] */
    public List<ReactionResult> parseReactions(JsonNode response) {
        var results = new ArrayList<ReactionResult>();
        for (JsonNode row : dataRows(response, REACTIONS_TABLE_NAME, REACTIONS_HEAD)) {
            results.add(new ReactionResult(
                    row.get(1).asInt(),
                    row.get(3).asDouble(),
                    row.get(4).asDouble(),
                    row.get(5).asDouble(),
                    row.get(6).asDouble(),
                    row.get(7).asDouble(),
                    row.get(8).asDouble()));
        }
        return results;
    }

    /** HEAD: ["Index", "Node", "Load", "DX", "DY", "DZ", "RX", "RY", "RZ"] */
    public List<DisplacementResult> parseDisplacements(JsonNode response) {
        var results = new ArrayList<DisplacementResult>();
        for (JsonNode row : dataRows(response, DISPLACEMENTS_TABLE_NAME, DISPLACEMENTS_HEAD)) {
            results.add(new DisplacementResult(
                    row.get(1).asInt(),
                    row.get(3).asDouble(),
                    row.get(4).asDouble(),
                    row.get(5).asDouble(),
                    row.get(6).asDouble(),
                    row.get(7).asDouble(),
                    row.get(8).asDouble()));
        }
        return results;
    }

    /**
     * Rows are read by FIXED column index, so the table's HEAD must be exactly the documented column list;
     * any other order, a missing HEAD or a different column count would silently read the wrong quantity.
     * (Units are not verified here - that remains open.)
     */
    private JsonNode dataRows(JsonNode response, String tableName, List<String> expectedHead) {
        JsonNode table = response.get(tableName);
        if (table == null) {
            throw new MidasApiException("Expected a \"" + tableName + "\" table in the MIDAS response, got: " + response);
        }
        JsonNode head = table.get("HEAD");
        if (head == null || !head.isArray() || head.size() != expectedHead.size()) {
            throw new MidasApiException("MIDAS \"" + tableName + "\" table has an unexpected HEAD (expected " + expectedHead
                    + ", got " + head + ")");
        }
        for (int i = 0; i < expectedHead.size(); i++) {
            if (!expectedHead.get(i).equals(head.get(i).asText())) {
                throw new MidasApiException("MIDAS \"" + tableName + "\" table column " + i + " is \"" + head.get(i).asText()
                        + "\", expected \"" + expectedHead.get(i) + "\" (full HEAD: " + head + ")");
            }
        }
        JsonNode data = table.get("DATA");
        if (data == null) {
            throw new MidasApiException("MIDAS \"" + tableName + "\" table response has no DATA: " + response);
        }
        return data;
    }
}
