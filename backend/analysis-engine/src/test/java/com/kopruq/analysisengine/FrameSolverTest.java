package com.kopruq.analysisengine;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ElasticLinkElement;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidRectangleSection;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Validates the direct-stiffness implementation against textbook
 * closed-form results (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md addendum
 * P's own "hand-worked reference case" validation discipline) - no
 * external solver to compare against yet, so these three cases exercise
 * bending (horizontal member), axial (vertical member) and the elastic
 * link independently, each with an exact closed-form answer.
 */
class FrameSolverTest {

    private static final double E = 30_000_000; // kN/m2
    private static final double POISSON = 0.2;
    private static final double DENSITY = 25.0; // kN/m3 (EN 1991-1-1 Table A.1)
    private static final double TOLERANCE = 1e-6;

    @Test
    void cantilever_selfWeight_tipDeflectionMatchesClosedForm() {
        // Horizontal cantilever along global X, fixed at node 1, free at node 2.
        double length = 10;
        double width = 1;  // local-y dimension
        double height = 2; // local-z dimension
        double area = width * height;
        double iy = width * Math.pow(height, 3) / 12.0;
        double selfWeightPerM = area * DENSITY;

        var request = new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, length, 0, 0)),
                List.of(new AnalysisElement(1, 1, 1, 1, 2)),
                List.of(),
                List.of(new AnalysisMaterial(1, "CONC", "TEST", E, POISSON, 1e-5, DENSITY, DENSITY / 9.81)),
                List.of(new SolidRectangleSection(1, "TEST", height, width)),
                List.of(new BoundaryCondition(1, true, true, true, true, true, true)),
                List.of(new LoadCase("SelfWeight", "D")),
                List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
                List.of());

        FrameSolver.SolveResult result = FrameSolver.solve(request);
        double dzTip = result.displacements().get(2)[2];

        double expectedMagnitude = selfWeightPerM * Math.pow(length, 4) / (8 * E * iy);

        assertTrue(dzTip < 0, "cantilever must sag downward under its own weight, got dz=" + dzTip);
        assertEquals(expectedMagnitude, Math.abs(dzTip), expectedMagnitude * 1e-9);

        double[] reactionAtFixedEnd = result.reactions().get(1);
        assertEquals(selfWeightPerM * length, Math.abs(reactionAtFixedEnd[2]), 1e-6);
    }

    @Test
    void verticalColumn_selfWeight_axialShorteningMatchesClosedForm() {
        // Vertical column along global Z, fixed at the base (node 1), free at the top (node 2).
        double length = 8;
        double side = 1;
        var request = new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 0, 0, length)),
                List.of(new AnalysisElement(1, 1, 1, 1, 2)),
                List.of(),
                List.of(new AnalysisMaterial(1, "CONC", "TEST", E, POISSON, 1e-5, DENSITY, DENSITY / 9.81)),
                List.of(new SolidRectangleSection(1, "TEST", side, side)),
                List.of(new BoundaryCondition(1, true, true, true, true, true, true)),
                List.of(new LoadCase("SelfWeight", "D")),
                List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
                List.of());

        FrameSolver.SolveResult result = FrameSolver.solve(request);
        double dzTop = result.displacements().get(2)[2];

        double expectedMagnitude = DENSITY * length * length / (2 * E);

        assertTrue(dzTop < 0, "column must shorten (move down) under its own weight, got dz=" + dzTop);
        assertEquals(expectedMagnitude, Math.abs(dzTop), expectedMagnitude * 1e-9);

        double area = side * side;
        double[] reactionAtBase = result.reactions().get(1);
        assertEquals(area * DENSITY * length, Math.abs(reactionAtBase[2]), 1e-6);
    }

    @Test
    void elasticLink_carriesTheFullWeightOfWhatHangsFromIt() {
        // Fixed node A -> elastic link -> node B -> cantilevered beam -> free node C.
        // A is the only support in the whole system, so its reaction must equal the
        // beam's total self-weight, and the spring's own F = k*delta relationship must hold.
        double length = 5;
        double side = 1;
        double area = side * side;
        double kz = 1000; // kN/m
        double kOther = 1_000_000; // stiff in every other direction - only kz is being tested here

        var request = new AnalysisRequest(
                List.of(
                        new AnalysisNode(1, 0, 0, 0),
                        new AnalysisNode(2, 0, 0, 0),
                        new AnalysisNode(3, length, 0, 0)),
                List.of(new AnalysisElement(1, 1, 1, 2, 3)),
                List.of(new ElasticLinkElement(1, 1, 2, kOther, kOther, kz, kOther, kOther, kOther)),
                List.of(new AnalysisMaterial(1, "CONC", "TEST", E, POISSON, 1e-5, DENSITY, DENSITY / 9.81)),
                List.of(new SolidRectangleSection(1, "TEST", side, side)),
                List.of(new BoundaryCondition(1, true, true, true, true, true, true)),
                List.of(new LoadCase("SelfWeight", "D")),
                List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
                List.of());

        FrameSolver.SolveResult result = FrameSolver.solve(request);
        double dzB = result.displacements().get(2)[2];
        double totalSelfWeight = area * DENSITY * length;

        assertTrue(dzB < 0, "node B must sag downward, got dz=" + dzB);
        assertEquals(totalSelfWeight / kz, Math.abs(dzB), (totalSelfWeight / kz) * 1e-6);

        double[] reactionAtA = result.reactions().get(1);
        assertEquals(totalSelfWeight, Math.abs(reactionAtA[2]), totalSelfWeight * 1e-6);
        assertEquals(Math.abs(reactionAtA[2]), Math.abs(kz * dzB), 1e-3);
    }
}
