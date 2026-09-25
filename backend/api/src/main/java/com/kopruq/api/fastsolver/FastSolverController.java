package com.kopruq.api.fastsolver;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisResult;
import com.kopruq.analysis.AnalysisSection;
import com.kopruq.analysis.AnalysisStatus;
import com.kopruq.analysis.DisplacementResult;
import com.kopruq.analysis.ReactionResult;
import com.kopruq.analysis.UniformElementLoad;
import com.kopruq.analysisengine.KopruqAnalysisEngine;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * KOPRUQ Fast Solver (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md addendum P):
 * runs the engineer's frame-bridge test case through the native
 * {@link KopruqAnalysisEngine} and returns reactions/displacements as a
 * flat, labelled table (same discipline as {@code AlternativeRow}/
 * {@code LayoutAlternativeRow} - a presentation DTO, not the solver's
 * own domain type).
 */
@RestController
@RequestMapping("/api/fast-solver")
@CrossOrigin(origins = "http://localhost:5173")
public class FastSolverController {

    private final FastSolverModelBuilder modelBuilder = new FastSolverModelBuilder();
    private final KopruqAnalysisEngine engine = new KopruqAnalysisEngine();

    @PostMapping("/solve")
    public FastSolverResponse solve(@RequestBody FastSolverRequest request) {
        FastSolverModel model = modelBuilder.build(request);

        var jobId = engine.submit(model.analysisRequest());
        AnalysisResult result = engine.getResults(jobId);

        if (result.status() != AnalysisStatus.COMPLETED) {
            return new FastSolverResponse(result.status().name(), result.errorMessage(), List.of(), List.of(), 0, 0);
        }

        Map<Integer, ReactionResult> reactionsByNode = new HashMap<>();
        for (ReactionResult r : result.reactions()) {
            reactionsByNode.put(r.nodeId(), r);
        }
        Map<Integer, DisplacementResult> displacementsByNode = new HashMap<>();
        for (DisplacementResult d : result.displacements()) {
            displacementsByNode.put(d.nodeId(), d);
        }

        var reactionRows = model.supportNodes().stream()
                .map(named -> {
                    ReactionResult r = reactionsByNode.get(named.nodeId());
                    return new SupportReactionRow(named.label(), named.chainageM(), r.fx(), r.fy(), r.fz(), r.mx(), r.my(), r.mz());
                })
                .toList();

        var displacementRows = model.deckNodes().stream()
                .map(named -> {
                    DisplacementResult d = displacementsByNode.get(named.nodeId());
                    return new DeckDisplacementRow(named.label(), named.chainageM(), d.dx(), d.dy(), d.dz(), d.rx(), d.ry(), d.rz());
                })
                .toList();

        double totalReactionKn = reactionRows.stream().mapToDouble(SupportReactionRow::fz).sum();
        double totalAppliedLoadKn = totalAppliedLoad(model);

        return new FastSolverResponse("COMPLETED", null, reactionRows, displacementRows, totalAppliedLoadKn, totalReactionKn);
    }

    /** Independent equilibrium check: total self-weight + SDL, computed directly from the model's own geometry. */
    private static double totalAppliedLoad(FastSolverModel model) {
        var request = model.analysisRequest();
        Map<Integer, AnalysisNode> nodesById = new HashMap<>();
        for (AnalysisNode n : request.nodes()) {
            nodesById.put(n.id(), n);
        }
        Map<Integer, AnalysisMaterial> materialsById = new HashMap<>();
        for (AnalysisMaterial m : request.materials()) {
            materialsById.put(m.id(), m);
        }
        Map<Integer, AnalysisSection> sectionsById = new HashMap<>();
        for (AnalysisSection s : request.sections()) {
            sectionsById.put(s.id(), s);
        }
        Map<Integer, UniformElementLoad> sdlByElement = new HashMap<>();
        for (UniformElementLoad load : request.uniformLoads()) {
            sdlByElement.put(load.elementId(), load);
        }

        double total = 0;
        boolean hasSelfWeight = !request.selfWeights().isEmpty();
        for (AnalysisElement element : request.elements()) {
            AnalysisNode ni = nodesById.get(element.nodeI());
            AnalysisNode nj = nodesById.get(element.nodeJ());
            double length = Math.sqrt(
                    Math.pow(nj.xM() - ni.xM(), 2) + Math.pow(nj.yM() - ni.yM(), 2) + Math.pow(nj.zM() - ni.zM(), 2));

            if (hasSelfWeight) {
                AnalysisMaterial material = materialsById.get(element.materialId());
                AnalysisSection section = sectionsById.get(element.sectionId());
                double area = section instanceof com.kopruq.analysis.SolidRectangleSection rect
                        ? rect.heightM() * rect.widthM() : 0;
                total += area * material.weightDensity() * length;
            }

            UniformElementLoad sdl = sdlByElement.get(element.id());
            if (sdl != null) {
                total += Math.abs(sdl.wzKnPerM()) * length;
            }
        }
        return total;
    }
}
