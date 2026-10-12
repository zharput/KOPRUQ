package com.kopruq.analysis.domain;

import com.kopruq.analysis.enums.LoadCaseKind;
import com.kopruq.analysis.enums.MaterialKind;
import com.kopruq.analysis.model.AnalysisElement;
import com.kopruq.analysis.model.AnalysisMaterial;
import com.kopruq.analysis.model.AnalysisNode;
import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.BoundaryCondition;
import com.kopruq.analysis.model.ElasticLinkElement;
import com.kopruq.analysis.model.FrameBridgeInput;
import com.kopruq.analysis.model.FrameBridgeModel;
import com.kopruq.analysis.model.LoadCase;
import com.kopruq.analysis.model.NamedNode;
import com.kopruq.analysis.model.SelfWeight;
import com.kopruq.analysis.model.SolidRectangleSection;
import com.kopruq.analysis.model.UniformElementLoad;
import com.kopruq.materials.domain.EurocodeConcrete;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds the solver-independent {@link AnalysisRequest} for the
 * engineer's 5-span frame-bridge test case (2026-09-10) from a
 * {@link FrameBridgeInput}.
 *
 * <p><b>Modelling simplifications</b> (stated explicitly, not silent -
 * spec section 22): the deck is one continuous spine of 1D frame
 * elements (not 6 separate girders); each pier is a portal frame (2
 * columns + cap beam, cap beam split into two segments meeting at a
 * center node); bearings are zero-length {@link ElasticLinkElement}s
 * connecting the deck spine directly to the cap-beam center node (or,
 * at the abutments, directly to a fixed foundation node) - the cap
 * beam's own depth and the bearing's own height are captured only as
 * cross-section/spring properties, not as separate node-elevation
 * offsets. Column base = fixed (ankastre), per the engineer's own
 * instruction for this test case.
 */
public final class FrameBridgeModelBuilder {

    public FrameBridgeModel build(FrameBridgeInput input) {
        int pierCount = input.pierHeightsM().size();

        var nodes = new ArrayList<AnalysisNode>();
        var elements = new ArrayList<AnalysisElement>();
        var elasticLinks = new ArrayList<ElasticLinkElement>();
        var supports = new ArrayList<BoundaryCondition>();
        var uniformLoads = new ArrayList<UniformElementLoad>();

        var idGen = new IdGenerator();

        double e = EurocodeConcrete.elasticModulusKnPerM2(input.concreteFckMpa());
        double unitWeight = EurocodeConcrete.UNIT_WEIGHT_REINFORCED_KN_PER_M3;
        var material = new AnalysisMaterial(
                1, MaterialKind.CONCRETE, "C" + (int) (double) input.concreteFckMpa(),
                e, EurocodeConcrete.POISSON_RATIO_UNCRACKED, EurocodeConcrete.THERMAL_COEFFICIENT_PER_C,
                unitWeight, EurocodeConcrete.massDensityTonnesPerM3(unitWeight));

        var deckSection = new SolidRectangleSection(1, "Deck", input.deckThicknessM(), input.deckWidthM());
        var columnSection = new SolidRectangleSection(2, "Column", input.columnLongitudinalM(), input.columnTransverseM());
        var capBeamSection = new SolidRectangleSection(3, "CapBeam", input.capBeamDepthM(), input.capBeamWidthM());

        // Chainage of each support (abutments + piers), in span order.
        List<Double> chainages = new ArrayList<>();
        double cumulative = 0;
        chainages.add(cumulative);
        for (double span : input.spanLengthsM()) {
            cumulative += span;
            chainages.add(cumulative);
        }

        double halfSpacing = input.columnSpacingTransverseM() / 2.0;

        // One deck-spine node + one substructure-top node (coincident - zero-length
        // bearing) per support; a fixed foundation node too (at the pier's own base
        // for piers, coincident with the substructure-top node for abutments).
        var deckNodeIds = new ArrayList<Integer>();
        var deckNamedNodes = new ArrayList<NamedNode>();
        var supportNamedNodes = new ArrayList<NamedNode>();

        for (int i = 0; i < chainages.size(); i++) {
            double x = chainages.get(i);
            boolean isPier = i > 0 && i < chainages.size() - 1;
            String label = i == 0 ? "C1" : i == chainages.size() - 1 ? "C2" : "P" + i;

            int deckNodeId = idGen.next();
            nodes.add(new AnalysisNode(deckNodeId, x, 0, 0));
            deckNodeIds.add(deckNodeId);
            deckNamedNodes.add(new NamedNode(label, deckNodeId, x));

            int substructureTopId = idGen.next();

            if (isPier) {
                double pierHeight = input.pierHeightsM().get(i - 1);
                nodes.add(new AnalysisNode(substructureTopId, x, 0, 0));

                int columnTopLeft = idGen.next();
                int columnTopRight = idGen.next();
                int columnBottomLeft = idGen.next();
                int columnBottomRight = idGen.next();
                nodes.add(new AnalysisNode(columnTopLeft, x, -halfSpacing, 0));
                nodes.add(new AnalysisNode(columnTopRight, x, halfSpacing, 0));
                nodes.add(new AnalysisNode(columnBottomLeft, x, -halfSpacing, -pierHeight));
                nodes.add(new AnalysisNode(columnBottomRight, x, halfSpacing, -pierHeight));

                elements.add(new AnalysisElement(idGen.next(), material.id(), columnSection.id(), columnBottomLeft, columnTopLeft));
                elements.add(new AnalysisElement(idGen.next(), material.id(), columnSection.id(), columnBottomRight, columnTopRight));
                elements.add(new AnalysisElement(idGen.next(), material.id(), capBeamSection.id(), columnTopLeft, substructureTopId));
                elements.add(new AnalysisElement(idGen.next(), material.id(), capBeamSection.id(), substructureTopId, columnTopRight));

                supports.add(new BoundaryCondition(columnBottomLeft, true, true, true, true, true, true));
                supports.add(new BoundaryCondition(columnBottomRight, true, true, true, true, true, true));
                supportNamedNodes.add(new NamedNode(label + "-Left", columnBottomLeft, x));
                supportNamedNodes.add(new NamedNode(label + "-Right", columnBottomRight, x));
            } else {
                // Abutment: fixed foundation coincides with the substructure-top node.
                nodes.add(new AnalysisNode(substructureTopId, x, 0, 0));
                supports.add(new BoundaryCondition(substructureTopId, true, true, true, true, true, true));
                supportNamedNodes.add(new NamedNode(label, substructureTopId, x));
            }

            elasticLinks.add(new ElasticLinkElement(
                    idGen.next(), deckNodeId, substructureTopId,
                    input.bearingKx(), input.bearingKy(), input.bearingKz(),
                    input.bearingKrx(), input.bearingKry(), input.bearingKrz()));
        }

        for (int i = 0; i < input.spanLengthsM().size(); i++) {
            int deckElementId = idGen.next();
            elements.add(new AnalysisElement(deckElementId, material.id(), deckSection.id(), deckNodeIds.get(i), deckNodeIds.get(i + 1)));
            uniformLoads.add(new UniformElementLoad("Service", deckElementId, 0, 0, -input.sdlKnPerM()));
        }

        var analysisRequest = new AnalysisRequest(
                nodes,
                elements,
                elasticLinks,
                List.of(material),
                List.of(deckSection, columnSection, capBeamSection),
                supports,
                List.of(new LoadCase("Service", LoadCaseKind.DEAD)),
                List.of(new SelfWeight("Service", 0, 0, -1)),
                uniformLoads);

        return new FrameBridgeModel(analysisRequest, deckNamedNodes, supportNamedNodes);
    }

    private static final class IdGenerator {
        private int next = 1;

        int next() {
            return next++;
        }
    }
}
