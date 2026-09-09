package com.spanova.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spanova.analysis.DisplacementResult;
import com.spanova.analysis.ReactionResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Fixtures below are the ACTUAL response bodies MIDAS Civil NX returned
 * during the live MIDAS-P01 round trip on 2026-09-09 (20 m
 * simply-supported beam, self-weight only, C30 concrete, 2x1 m solid
 * rectangle section) - not invented data. Reaction sum (980 kN) and end
 * rotation (0.000817 rad) were independently hand-verified against
 * weight = 20*2*1*24.5 and theta = wL^3/(24*E*I) - see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md.
 */
class MidasResultExtractorTest {

    private static final String REACTIONS_RESPONSE = """
            {"Reactions":{"FORCE":"KN","DIST":"M","HEAD":["Index","Node","Load","FX","FY","FZ","MX","MY","MZ"],\
            "DATA":[["1","1","SelfWeight","0.000000","0.000000","490.000000","0.000000","0.000000","0.000000"],\
            ["2","2","SelfWeight","0.000000","0.000000","490.000000","0.000000","0.000000","0.000000"]],\
            "SUB_TABLES":[{"SUMMATION OF REACTION FORCES PRINTOUT":{"HEAD":["Load","FX(kN)","FY(kN)","FZ(kN)"],\
            "DATA":[["SelfWeight","0.000000","0.000000","980.000000"]]}}]}}""";

    private static final String DISPLACEMENTS_RESPONSE = """
            {"Displacements":{"FORCE":"KN","DIST":"M","HEAD":["Index","Node","Load","DX","DY","DZ","RX","RY","RZ"],\
            "DATA":[["1","1","SelfWeight","0.000000","0.000000","0.000000","0.000000","0.000817","0.000000"],\
            ["2","2","SelfWeight","0.000000","0.000000","0.000000","0.000000","-0.000817","0.000000"]]}}""";

    private final ObjectMapper mapper = new ObjectMapper();
    private final MidasResultExtractor extractor = new MidasResultExtractor();

    @Test
    void reactionsRequest_setsTheVerifiedTableTypeAndLoadCaseSuffix() {
        MidasApiCall call = extractor.reactionsRequest("SelfWeight");

        assertEquals("POST", call.method());
        assertEquals("/post/table", call.path());
        assertEquals("REACTIONG", call.body().get("Argument").get("TABLE_TYPE").asText());
        assertEquals("SelfWeight(ST)", call.body().get("Argument").get("LOAD_CASE_NAMES").get(0).asText());
    }

    @Test
    void parseReactions_matchesTheLiveMidasResponse_andHandCalculatedSelfWeight() throws Exception {
        JsonNode response = mapper.readTree(REACTIONS_RESPONSE);

        List<ReactionResult> reactions = extractor.parseReactions(response);

        assertEquals(2, reactions.size());
        assertEquals(new ReactionResult(1, 0, 0, 490.0, 0, 0, 0), reactions.get(0));
        assertEquals(new ReactionResult(2, 0, 0, 490.0, 0, 0, 0), reactions.get(1));

        double totalFz = reactions.stream().mapToDouble(ReactionResult::fz).sum();
        double handCalculatedSelfWeightKn = 20 * 2 * 1 * 24.5; // L * H * B * unit weight
        assertEquals(handCalculatedSelfWeightKn, totalFz, 1e-6);
    }

    @Test
    void parseDisplacements_matchesTheLiveMidasResponse_andHandCalculatedEndRotation() throws Exception {
        JsonNode response = mapper.readTree(DISPLACEMENTS_RESPONSE);

        List<DisplacementResult> displacements = extractor.parseDisplacements(response);

        assertEquals(2, displacements.size());
        assertEquals(new DisplacementResult(1, 0, 0, 0, 0, 0.000817, 0), displacements.get(0));
        assertEquals(new DisplacementResult(2, 0, 0, 0, 0, -0.000817, 0), displacements.get(1));

        // theta = w*L^3 / (24*E*I), w=49 kN/m, L=20m, E=30e6 kN/m2, I(RYY)=0.6666666666666666 m4
        double w = 49;
        double length = 20;
        double elasticModulus = 30_000_000;
        double momentOfInertia = 0.6666666666666666;
        double handCalculatedEndRotation = (w * Math.pow(length, 3)) / (24 * elasticModulus * momentOfInertia);
        assertEquals(handCalculatedEndRotation, displacements.get(0).ry(), 1e-6);
    }
}
