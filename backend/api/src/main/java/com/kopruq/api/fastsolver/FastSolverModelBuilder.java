package com.kopruq.api.fastsolver;

import com.kopruq.api.error.FieldViolation;
import com.kopruq.api.error.InvalidRequestException;
import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ElasticLinkElement;
import com.kopruq.analysis.EurocodeConcrete;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidRectangleSection;
import com.kopruq.analysis.UniformElementLoad;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds the solver-independent {@link AnalysisRequest} for the
 * engineer's 5-span frame-bridge test case (2026-09-10) from
 * {@link FastSolverRequest}'s form fields.
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
public final class FastSolverModelBuilder {

    public FastSolverModel build(FastSolverRequest request) {
        validate(request);
        int pierCount = request.pierHeightsM().size();

        var nodes = new ArrayList<AnalysisNode>();
        var elements = new ArrayList<AnalysisElement>();
        var elasticLinks = new ArrayList<ElasticLinkElement>();
        var supports = new ArrayList<BoundaryCondition>();
        var uniformLoads = new ArrayList<UniformElementLoad>();

        var idGen = new IdGenerator();

        double e = EurocodeConcrete.elasticModulusKnPerM2(request.concreteFckMpa());
        double unitWeight = EurocodeConcrete.UNIT_WEIGHT_REINFORCED_KN_PER_M3;
        var material = new AnalysisMaterial(
                1, "CONC", "C" + (int) (double) request.concreteFckMpa(),
                e, EurocodeConcrete.POISSON_RATIO_UNCRACKED, EurocodeConcrete.THERMAL_COEFFICIENT_PER_C,
                unitWeight, EurocodeConcrete.massDensityTonnesPerM3(unitWeight));

        var deckSection = new SolidRectangleSection(1, "Deck", request.deckThicknessM(), request.deckWidthM());
        var columnSection = new SolidRectangleSection(2, "Column", request.columnLongitudinalM(), request.columnTransverseM());
        var capBeamSection = new SolidRectangleSection(3, "CapBeam", request.capBeamDepthM(), request.capBeamWidthM());

        // Chainage of each support (abutments + piers), in span order.
        List<Double> chainages = new ArrayList<>();
        double cumulative = 0;
        chainages.add(cumulative);
        for (double span : request.spanLengthsM()) {
            cumulative += span;
            chainages.add(cumulative);
        }

        double halfSpacing = request.columnSpacingTransverseM() / 2.0;

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
                double pierHeight = request.pierHeightsM().get(i - 1);
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
                    request.bearingKx(), request.bearingKy(), request.bearingKz(),
                    request.bearingKrx(), request.bearingKry(), request.bearingKrz()));
        }

        for (int i = 0; i < request.spanLengthsM().size(); i++) {
            int deckElementId = idGen.next();
            elements.add(new AnalysisElement(deckElementId, material.id(), deckSection.id(), deckNodeIds.get(i), deckNodeIds.get(i + 1)));
            uniformLoads.add(new UniformElementLoad("Service", deckElementId, 0, 0, -request.sdlKnPerM()));
        }

        var analysisRequest = new AnalysisRequest(
                nodes,
                elements,
                elasticLinks,
                List.of(material),
                List.of(deckSection, columnSection, capBeamSection),
                supports,
                List.of(new LoadCase("Service", "D")),
                List.of(new SelfWeight("Service", 0, 0, -1)),
                uniformLoads);

        return new FastSolverModel(analysisRequest, deckNamedNodes, supportNamedNodes);
    }

    /**
     * Input-domain checks only (finite numbers, required fields, dimensions
     * greater than 0) - no engineering limit is applied. {@code sdlKnPerM} and
     * the bearing stiffnesses are required and finite but deliberately have no
     * sign/range rule. Every violation is collected and reported together.
     */
    static void validate(FastSolverRequest request) {
        var violations = new ArrayList<FieldViolation>();
        if (request == null) {
            violations.add(new FieldViolation("request", "is required"));
            throw new InvalidRequestException(violations);
        }

        List<Double> spans = request.spanLengthsM();
        if (spans == null) {
            violations.add(new FieldViolation("spanLengthsM", "is required"));
        } else if (spans.isEmpty()) {
            violations.add(new FieldViolation("spanLengthsM", "must contain at least one span"));
        } else {
            for (int i = 0; i < spans.size(); i++) {
                requirePositive(violations, "spanLengthsM[" + i + "]", spans.get(i));
            }
        }

        List<Double> piers = request.pierHeightsM();
        if (piers == null) {
            violations.add(new FieldViolation("pierHeightsM", "is required"));
        } else {
            for (int i = 0; i < piers.size(); i++) {
                requirePositive(violations, "pierHeightsM[" + i + "]", piers.get(i));
            }
            if (spans != null && !spans.isEmpty() && piers.size() != spans.size() - 1) {
                violations.add(new FieldViolation("pierHeightsM",
                        "must have one entry per intermediate pier (spanCount - 1 = " + (spans.size() - 1) + "), got " + piers.size()));
            }
        }

        requirePositive(violations, "deckWidthM", request.deckWidthM());
        requirePositive(violations, "deckThicknessM", request.deckThicknessM());
        requirePositive(violations, "columnLongitudinalM", request.columnLongitudinalM());
        requirePositive(violations, "columnTransverseM", request.columnTransverseM());
        requirePositive(violations, "columnSpacingTransverseM", request.columnSpacingTransverseM());
        requirePositive(violations, "capBeamWidthM", request.capBeamWidthM());
        requirePositive(violations, "capBeamDepthM", request.capBeamDepthM());
        requirePositive(violations, "concreteFckMpa", request.concreteFckMpa());

        requireFinite(violations, "sdlKnPerM", request.sdlKnPerM());
        requireFinite(violations, "bearingKx", request.bearingKx());
        requireFinite(violations, "bearingKy", request.bearingKy());
        requireFinite(violations, "bearingKz", request.bearingKz());
        requireFinite(violations, "bearingKrx", request.bearingKrx());
        requireFinite(violations, "bearingKry", request.bearingKry());
        requireFinite(violations, "bearingKrz", request.bearingKrz());

        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
    }

    private static void requireFinite(List<FieldViolation> violations, String field, Double value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        } else if (!Double.isFinite(value)) {
            violations.add(new FieldViolation(field, "must be a finite number"));
        }
    }

    private static void requirePositive(List<FieldViolation> violations, String field, Double value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        } else if (!Double.isFinite(value)) {
            violations.add(new FieldViolation(field, "must be a finite number"));
        } else if (value <= 0) {
            violations.add(new FieldViolation(field, "must be greater than 0"));
        }
    }

    private static final class IdGenerator {
        private int next = 1;

        int next() {
            return next++;
        }
    }
}
