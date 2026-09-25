package com.kopruq.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.AnalysisSection;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ISection;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidCircularSection;
import com.kopruq.analysis.SolidRectangleSection;

import java.util.ArrayList;
import java.util.List;

/**
 * Translates a solver-independent {@link AnalysisRequest} into the exact
 * sequence of MIDAS Open API calls needed to build it. Pure - no
 * network access, so it is unit-testable without a live MIDAS
 * connection. Every JSON shape below was verified against the
 * engineer's own running MIDAS Civil NX on 2026-09-09 (see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md) - none of it is guessed.
 *
 * <p>MIDAS-P01 scope only: isotropic materials, solid-rectangle
 * ("Value"/"SB") sections, beam elements, translation/rotation
 * constraint supports, and self-weight. No load combinations,
 * construction stages, moving loads, tendons or seismic - adding those
 * needs their own verified schema first (see the analysis doc's
 * capability matrix for what is/isn't confirmed yet).
 */
public final class MidasModelBuilder {

    private final ObjectMapper mapper = new ObjectMapper();

    public List<MidasApiCall> buildCalls(AnalysisRequest request) {
        var calls = new ArrayList<MidasApiCall>();
        calls.add(newProject());
        if (!request.loadCases().isEmpty()) {
            calls.add(loadCases(request.loadCases()));
        }
        if (!request.materials().isEmpty()) {
            calls.add(materials(request.materials()));
        }
        if (!request.sections().isEmpty()) {
            calls.add(sections(request.sections()));
        }
        if (!request.nodes().isEmpty()) {
            calls.add(nodes(request.nodes()));
        }
        if (!request.elements().isEmpty()) {
            calls.add(elements(request.elements()));
        }
        if (!request.supports().isEmpty()) {
            calls.add(supports(request.supports()));
        }
        if (!request.selfWeights().isEmpty()) {
            calls.add(selfWeights(request.selfWeights()));
        }
        return calls;
    }

    private MidasApiCall newProject() {
        return new MidasApiCall("POST", "/doc/new", mapper.createObjectNode());
    }

    private MidasApiCall loadCases(List<LoadCase> loadCases) {
        ObjectNode assign = mapper.createObjectNode();
        int index = 1;
        for (LoadCase loadCase : loadCases) {
            ObjectNode entry = assign.putObject(String.valueOf(index++));
            entry.put("NAME", loadCase.name());
            entry.put("TYPE", loadCase.type());
        }
        return new MidasApiCall("PUT", "/db/stld", wrapAssign(assign));
    }

    private MidasApiCall materials(List<AnalysisMaterial> materials) {
        ObjectNode assign = mapper.createObjectNode();
        for (AnalysisMaterial material : materials) {
            ObjectNode entry = assign.putObject(String.valueOf(material.id()));
            entry.put("TYPE", material.type());
            entry.put("NAME", material.name());
            ObjectNode param = entry.putObject("PARAM");
            param.put("P_TYPE", 2); // Isotropic - see analysis-api's AnalysisMaterial doc
            param.put("ELAST", material.elasticModulus());
            param.put("POISN", material.poissonRatio());
            param.put("THERMAL", material.thermalCoefficient());
            param.put("DEN", material.weightDensity());
            param.put("MASS", material.massDensity());
        }
        return new MidasApiCall("PUT", "/db/matl", wrapAssign(assign));
    }

    private MidasApiCall sections(List<AnalysisSection> sections) {
        ObjectNode assign = mapper.createObjectNode();
        for (AnalysisSection section : sections) {
            ObjectNode entry = assign.putObject(String.valueOf(section.id()));
            entry.put("SECTTYPE", "VALUE");
            entry.put("SECT_NAME", section.name());
            ObjectNode before = entry.putObject("SECT_BEFORE");
            before.put("SHAPE", shapeCode(section));
            ObjectNode sectI = before.putObject("SECT_I");
            var vSize = sectI.putArray("vSIZE");
            for (double dim : dimensions(section)) {
                vSize.add(dim);
            }
        }
        return new MidasApiCall("PUT", "/db/sect", wrapAssign(assign));
    }

    private String shapeCode(AnalysisSection section) {
        return switch (section) {
            case SolidRectangleSection ignored -> "SB";
            case ISection ignored -> "H";
            case SolidCircularSection ignored -> "SR";
        };
    }

    /** vSIZE order per shape, from MIDAS's own "Dimension Table for Value Sections". */
    private double[] dimensions(AnalysisSection section) {
        return switch (section) {
            case SolidRectangleSection s -> new double[]{s.heightM(), s.widthM()};
            case ISection s -> new double[]{
                    s.heightM(), s.topFlangeWidthM(), s.webThicknessM(), s.topFlangeThicknessM(),
                    s.bottomFlangeWidthM(), s.bottomFlangeThicknessM(), 0, 0};
            case SolidCircularSection s -> new double[]{s.diameterM()};
        };
    }

    private MidasApiCall nodes(List<AnalysisNode> nodes) {
        ObjectNode assign = mapper.createObjectNode();
        for (AnalysisNode node : nodes) {
            ObjectNode entry = assign.putObject(String.valueOf(node.id()));
            entry.put("X", node.xM());
            entry.put("Y", node.yM());
            entry.put("Z", node.zM());
        }
        return new MidasApiCall("PUT", "/db/node", wrapAssign(assign));
    }

    private MidasApiCall elements(List<AnalysisElement> elements) {
        ObjectNode assign = mapper.createObjectNode();
        for (AnalysisElement element : elements) {
            ObjectNode entry = assign.putObject(String.valueOf(element.id()));
            entry.put("TYPE", "BEAM");
            entry.put("MATL", element.materialId());
            entry.put("SECT", element.sectionId());
            var nodeIds = entry.putArray("NODE");
            nodeIds.add(element.nodeI());
            nodeIds.add(element.nodeJ());
        }
        return new MidasApiCall("PUT", "/db/elem", wrapAssign(assign));
    }

    private MidasApiCall supports(List<BoundaryCondition> supports) {
        ObjectNode assign = mapper.createObjectNode();
        for (BoundaryCondition support : supports) {
            ObjectNode entry = assign.putObject(String.valueOf(support.nodeId()));
            var items = entry.putArray("ITEMS");
            ObjectNode item = items.addObject();
            item.put("ID", 1);
            item.put("CONSTRAINT", constraintString(support));
        }
        return new MidasApiCall("PUT", "/db/cons", wrapAssign(assign));
    }

    /** [DX, DY, DZ, RX, RY, RZ, RW] - RW (warping) is not modelled at MIDAS-P01, always unconstrained. */
    private String constraintString(BoundaryCondition support) {
        return "" + bit(support.dx()) + bit(support.dy()) + bit(support.dz())
                + bit(support.rx()) + bit(support.ry()) + bit(support.rz()) + "0";
    }

    private char bit(boolean constrained) {
        return constrained ? '1' : '0';
    }

    private MidasApiCall selfWeights(List<SelfWeight> selfWeights) {
        ObjectNode assign = mapper.createObjectNode();
        int index = 1;
        for (SelfWeight selfWeight : selfWeights) {
            ObjectNode entry = assign.putObject(String.valueOf(index++));
            entry.put("LCNAME", selfWeight.loadCaseName());
            var fv = entry.putArray("FV");
            fv.add(selfWeight.factorX());
            fv.add(selfWeight.factorY());
            fv.add(selfWeight.factorZ());
        }
        return new MidasApiCall("PUT", "/db/bodf", wrapAssign(assign));
    }

    private JsonNode wrapAssign(ObjectNode node) {
        ObjectNode wrapper = mapper.createObjectNode();
        wrapper.set("Assign", node);
        return wrapper;
    }
}
