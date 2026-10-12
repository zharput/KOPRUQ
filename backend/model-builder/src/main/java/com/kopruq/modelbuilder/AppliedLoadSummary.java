package com.kopruq.modelbuilder;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.AnalysisSection;
import com.kopruq.analysis.SolidRectangleSection;
import com.kopruq.analysis.UniformElementLoad;

import java.util.HashMap;
import java.util.Map;

/**
 * Independent equilibrium check: the total self-weight + SDL of a model, computed directly from the model own geometry
 * (not from the solver). Kept deliberately separate from the solver code so it can disagree with it.
 */
public final class AppliedLoadSummary {

    private AppliedLoadSummary() {
    }

    /**
     * @return total applied vertical load in kN (self-weight of every element when the request has a self-weight
     *         entry, plus the magnitude of every uniform element load times the element length)
     * @throws IllegalArgumentException if self-weight is requested for an element whose section is not a solid
     *         rectangle (the only section this check can compute an area for) - it must not silently count as zero
     */
    public static double totalAppliedLoadKn(AnalysisRequest request) {
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
                if (!(section instanceof SolidRectangleSection rect)) {
                    throw new IllegalArgumentException("element " + element.id()
                            + ": self-weight can only be summed for solid rectangular sections, got " + section);
                }
                double area = rect.heightM() * rect.widthM();
                total += area * material.weightDensityKnPerM3() * length;
            }

            UniformElementLoad sdl = sdlByElement.get(element.id());
            if (sdl != null) {
                total += Math.abs(sdl.wzKnPerM()) * length;
            }
        }
        return total;
    }
}
