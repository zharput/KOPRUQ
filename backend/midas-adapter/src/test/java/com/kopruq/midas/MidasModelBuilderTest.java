package com.kopruq.midas;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ISection;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidCircularSection;
import com.kopruq.analysis.SolidRectangleSection;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies {@link MidasModelBuilder} produces the same request shapes
 * verified live against MIDAS Civil NX on 2026-09-09 (20 m
 * simply-supported beam, self-weight only) - see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md.
 */
class MidasModelBuilderTest {

    private static final AnalysisRequest SIMPLE_BEAM = new AnalysisRequest(
            List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 20, 0, 0)),
            List.of(new AnalysisElement(1, 1, 1, 1, 2)),
            List.of(),
            List.of(new AnalysisMaterial(1, "CONC", "C30", 30_000_000, 0.2, 0.00001, 24.5, 2.5)),
            List.of(new SolidRectangleSection(1, "GIRDER-1", 2.0, 1.0)),
            List.of(
                    new BoundaryCondition(1, true, true, true, true, false, false),
                    new BoundaryCondition(2, false, true, true, true, false, false)),
            List.of(new LoadCase("SelfWeight", "D")),
            List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
            List.of());

    private final MidasModelBuilder builder = new MidasModelBuilder();

    @Test
    void buildCalls_producesOneCallPerNonEmptySection_inDependencyOrder() {
        List<MidasApiCall> calls = builder.buildCalls(SIMPLE_BEAM);

        assertEquals(
                List.of("/doc/new", "/db/stld", "/db/matl", "/db/sect", "/db/node", "/db/elem", "/db/cons", "/db/bodf"),
                calls.stream().map(MidasApiCall::path).toList());
    }

    @Test
    void materials_matchTheVerifiedIsotropicSchema() {
        JsonAssertHelper.assertJson(callFor("/db/matl", SIMPLE_BEAM), """
                {"Assign":{"1":{"TYPE":"CONC","NAME":"C30","PARAM":{"P_TYPE":2,"ELAST":3.0E7,"POISN":0.2,"THERMAL":1.0E-5,"DEN":24.5,"MASS":2.5}}}}""");
    }

    @Test
    void sections_matchTheVerifiedSolidRectangleSchema() {
        JsonAssertHelper.assertJson(callFor("/db/sect", SIMPLE_BEAM), """
                {"Assign":{"1":{"SECTTYPE":"VALUE","SECT_NAME":"GIRDER-1","SECT_BEFORE":{"SHAPE":"SB","SECT_I":{"vSIZE":[2.0,1.0]}}}}}""");
    }

    @Test
    void sections_matchTheVerifiedISectionSchema() {
        var request = onlySections(new ISection(1, "GIRDER-VIA35", 1.90, 1.50, 0.20, 0.80, 0.40, 0.25));

        JsonAssertHelper.assertJson(callFor("/db/sect", request), """
                {"Assign":{"1":{"SECTTYPE":"VALUE","SECT_NAME":"GIRDER-VIA35","SECT_BEFORE":{"SHAPE":"H",\
                "SECT_I":{"vSIZE":[1.90,1.50,0.25,0.20,0.80,0.40,0.0,0.0]}}}}}""");
    }

    @Test
    void sections_matchTheVerifiedSolidCircularSchema() {
        var request = onlySections(new SolidCircularSection(1, "PIER-P1", 3.20));

        JsonAssertHelper.assertJson(callFor("/db/sect", request), """
                {"Assign":{"1":{"SECTTYPE":"VALUE","SECT_NAME":"PIER-P1","SECT_BEFORE":{"SHAPE":"SR","SECT_I":{"vSIZE":[3.20]}}}}}""");
    }

    private AnalysisRequest onlySections(com.kopruq.analysis.AnalysisSection... sections) {
        return new AnalysisRequest(List.of(), List.of(), List.of(), List.of(), List.of(sections), List.of(), List.of(), List.of(), List.of());
    }

    @Test
    void nodes_matchTheVerifiedNodeSchema() {
        JsonAssertHelper.assertJson(callFor("/db/node", SIMPLE_BEAM), """
                {"Assign":{"1":{"X":0.0,"Y":0.0,"Z":0.0},"2":{"X":20.0,"Y":0.0,"Z":0.0}}}""");
    }

    @Test
    void elements_matchTheVerifiedBeamSchema() {
        JsonAssertHelper.assertJson(callFor("/db/elem", SIMPLE_BEAM), """
                {"Assign":{"1":{"TYPE":"BEAM","MATL":1,"SECT":1,"NODE":[1,2]}}}""");
    }

    @Test
    void supports_buildTheConstraintStringInDxDyDzRxRyRzRwOrder() {
        JsonAssertHelper.assertJson(callFor("/db/cons", SIMPLE_BEAM), """
                {"Assign":{"1":{"ITEMS":[{"ID":1,"CONSTRAINT":"1111000"}]},"2":{"ITEMS":[{"ID":1,"CONSTRAINT":"0111000"}]}}}""");
    }

    @Test
    void selfWeight_matchesTheVerifiedBodfSchema() {
        JsonAssertHelper.assertJson(callFor("/db/bodf", SIMPLE_BEAM), """
                {"Assign":{"1":{"LCNAME":"SelfWeight","FV":[0.0,0.0,-1.0]}}}""");
    }

    @Test
    void buildCalls_skipsEmptySections() {
        var requestWithNoSupports = new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0)),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of());

        List<MidasApiCall> calls = builder.buildCalls(requestWithNoSupports);

        assertEquals(List.of("/doc/new", "/db/node"), calls.stream().map(MidasApiCall::path).toList());
        assertTrue(calls.stream().noneMatch(c -> c.path().equals("/db/cons")));
    }

    private MidasApiCall callFor(String path, AnalysisRequest request) {
        return builder.buildCalls(request).stream()
                .filter(c -> c.path().equals(path))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No call built for " + path));
    }
}
