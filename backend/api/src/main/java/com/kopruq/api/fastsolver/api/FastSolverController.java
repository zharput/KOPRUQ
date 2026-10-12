package com.kopruq.api.fastsolver.api;

import com.kopruq.api.fastsolver.application.FastSolverOutcome;
import com.kopruq.api.fastsolver.application.FastSolverService;
import com.kopruq.modelbuilder.FrameBridgeModel;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * KOPRUQ Fast Solver (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md addendum P):
 * runs the engineer's frame-bridge test case through the native
 * analysis engine ({@link FastSolverService}) and returns reactions/displacements as a
 * flat, labelled table (same discipline as {@code AlternativeRow}/
 * {@code LayoutAlternativeRow} - a presentation DTO, not the solver's
 * own domain type).
 */
@RestController
@RequestMapping("/api/fast-solver")
public class FastSolverController {

    private final FastSolverModelBuilder modelBuilder;
    private final FastSolverService solverService;

    public FastSolverController(FastSolverModelBuilder modelBuilder, FastSolverService solverService) {
        this.modelBuilder = modelBuilder;
        this.solverService = solverService;
    }

    @PostMapping("/solve")
    public FastSolverResponse solve(@RequestBody FastSolverRequest request) {
        FrameBridgeModel model = modelBuilder.build(request);
        return toResponse(solverService.solve(model));
    }

    private static FastSolverResponse toResponse(FastSolverOutcome outcome) {
        var reactionRows = outcome.supportReactions().stream()
                .map(sr -> {
                    var named = sr.node();
                    var r = sr.reaction();
                    return new SupportReactionRow(named.label(), named.chainageM(), r.fx(), r.fy(), r.fz(), r.mx(), r.my(), r.mz());
                })
                .toList();
        var displacementRows = outcome.deckDisplacements().stream()
                .map(dd -> {
                    var named = dd.node();
                    var d = dd.displacement();
                    return new DeckDisplacementRow(named.label(), named.chainageM(), d.dx(), d.dy(), d.dz(), d.rx(), d.ry(), d.rz());
                })
                .toList();
        return new FastSolverResponse(outcome.status(), outcome.errorMessage(), reactionRows, displacementRows,
                outcome.totalAppliedLoadKn(), outcome.totalReactionKn());
    }
}
