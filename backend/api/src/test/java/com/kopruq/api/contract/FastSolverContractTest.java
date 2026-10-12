package com.kopruq.api.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * BACKEND-REMEDIATION Faz 0b: snapshot of the engineer's 5-span example
 * (spans 30/40/50/40/25 m, piers 10/15/20/8 m, C30). CHARACTERIZATION of
 * the current solver output (relative tolerance 1e-9) - this is not an
 * engineering validation of the numbers.
 */
class FastSolverContractTest extends ContractTestSupport {

    private static final double REL = 1e-9;

    private static void assertRel(double expected, double actual, String what) {
        double tol = Math.max(1e-9, Math.abs(expected) * REL);
        assertEquals(expected, actual, tol, what);
    }

    @Test
    void engineerFiveSpanExample_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/fast-solver/solve", FAST_SOLVER_BODY);
        assertEquals("COMPLETED", n.get("status").asText());
        assertEquals(10, n.get("reactions").size());
        assertEquals(6, n.get("deckDisplacements").size());

        Map<String, Double> fz = Map.of(
                "C1", 4527.651567354706,
                "P1-Left", 9408.209819165037,
                "P2-Left", 12505.691936012136,
                "P3-Left", 13613.210058345732,
                "P4-Left", 8443.641661821486,
                "C2", 3555.8414819565414);
        for (JsonNode r : n.get("reactions")) {
            Double expected = fz.get(r.get("label").asText());
            if (expected != null) {
                assertRel(expected, r.get("fz").asDouble(), r.get("label").asText() + " fz");
            }
        }
        assertEquals("C1", n.get("reactions").get(0).get("label").asText());
        assertRel(-886.3412984046, n.get("reactions").get(0).get("my").asDouble(), "C1 my");

        Map<String, Double> dz = Map.of(
                "C1", -0.045276515673547055,
                "P1", -0.14108004560272056,
                "P2", -0.18391048777511676,
                "P3", -0.18645207311227913,
                "P4", -0.1295489628772206,
                "C2", -0.03555841481956541);
        for (JsonNode d : n.get("deckDisplacements")) {
            assertRel(dz.get(d.get("label").asText()), d.get("dz").asDouble(), d.get("label").asText() + " dz");
        }

        // Global equilibrium: applied load equals the sum of vertical reactions.
        assertRel(96025.0, n.get("totalAppliedLoadKn").asDouble(), "totalAppliedLoadKn");
        assertRel(n.get("totalAppliedLoadKn").asDouble(), n.get("totalReactionKn").asDouble(), "equilibrium");
    }

    @Test
    void responseFieldNames_areStable() throws Exception {
        JsonNode n = postJsonOk("/api/fast-solver/solve", FAST_SOLVER_BODY);
        assertEquals("[status, errorMessage, reactions, deckDisplacements, totalAppliedLoadKn, totalReactionKn]",
                names(n));
        assertEquals("[label, chainageM, fx, fy, fz, mx, my, mz]", names(n.get("reactions").get(0)));
        assertEquals("[label, chainageM, dx, dy, dz, rx, ry, rz]", names(n.get("deckDisplacements").get(0)));
    }

    // ---- Faz 4 (was current_fastSolverMissingSdl_completesSilently): invalid input is a 400 with field names.

    private JsonNode expect400(String body) throws Exception {
        var result = postJson("/api/fast-solver/solve", body);
        assertEquals(400, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode n = body(result);
        assertEquals("INVALID_REQUEST", n.get("code").asText());
        return n;
    }

    private static java.util.Set<String> fields(JsonNode errorBody) {
        var set = new java.util.TreeSet<String>();
        errorBody.get("errors").forEach(e -> set.add(e.get("field").asText()));
        return set;
    }

    @Test
    void missingField_is400_namingTheField() throws Exception {
        JsonNode n = expect400(FAST_SOLVER_BODY.replace("\"sdlKnPerM\":10,", ""));
        assertEquals(java.util.Set.of("sdlKnPerM"), fields(n));
        n = expect400(FAST_SOLVER_BODY.replace("\"bearingKrz\":100000", "\"bearingKrz\":null"));
        assertEquals(java.util.Set.of("bearingKrz"), fields(n));
        n = expect400("{}");
        assertEquals(17, fields(n).size());
    }

    @Test
    void nullListElement_nonFiniteAndNonPositiveValues_are400() throws Exception {
        assertEquals(java.util.Set.of("spanLengthsM[1]"), fields(expect400(
                FAST_SOLVER_BODY.replace("[30,40,50,40,25]", "[30,null,50,40,25]"))));
        assertEquals(java.util.Set.of("deckWidthM"), fields(expect400(
                FAST_SOLVER_BODY.replace("\"deckWidthM\":15", "\"deckWidthM\":\"NaN\""))));
        assertEquals(java.util.Set.of("sdlKnPerM"), fields(expect400(
                FAST_SOLVER_BODY.replace("\"sdlKnPerM\":10", "\"sdlKnPerM\":\"Infinity\""))));
        assertEquals(java.util.Set.of("deckThicknessM"), fields(expect400(
                FAST_SOLVER_BODY.replace("\"deckThicknessM\":1", "\"deckThicknessM\":0"))));
        assertEquals(java.util.Set.of("concreteFckMpa"), fields(expect400(
                FAST_SOLVER_BODY.replace("\"concreteFckMpa\":30", "\"concreteFckMpa\":-5"))));
        assertEquals(java.util.Set.of("pierHeightsM"), fields(expect400(
                FAST_SOLVER_BODY.replace("[10,15,20,8]", "[10,15]"))));
    }

    @Test
    void negativeSdlAndAnyBearingValue_areNotRejectedByTheSignRule() throws Exception {
        JsonNode n = postJsonOk("/api/fast-solver/solve", FAST_SOLVER_BODY.replace("\"sdlKnPerM\":10", "\"sdlKnPerM\":-3"));
        assertEquals("COMPLETED", n.get("status").asText());
    }

    private static String names(JsonNode node) {
        var list = new java.util.ArrayList<String>();
        node.fieldNames().forEachRemaining(list::add);
        return list.toString();
    }
}
