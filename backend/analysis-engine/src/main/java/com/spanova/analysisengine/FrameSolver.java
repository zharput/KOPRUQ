package com.spanova.analysisengine;

import com.spanova.analysis.AnalysisElement;
import com.spanova.analysis.AnalysisMaterial;
import com.spanova.analysis.AnalysisNode;
import com.spanova.analysis.AnalysisRequest;
import com.spanova.analysis.AnalysisSection;
import com.spanova.analysis.BoundaryCondition;
import com.spanova.analysis.ElasticLinkElement;
import com.spanova.analysis.SelfWeight;
import com.spanova.analysis.UniformElementLoad;

import java.util.HashMap;
import java.util.Map;

/**
 * The actual linear-elastic direct-stiffness solve: assemble the global
 * stiffness matrix and load vector, apply boundary conditions, solve for
 * displacements, back out reactions. Separated from
 * {@link SpanovaAnalysisEngine} so the pure numerics can be unit-tested
 * (against textbook closed-form results) without the
 * submit/job/exception-handling wrapper.
 */
final class FrameSolver {

    private FrameSolver() {
    }

    static SolveResult solve(AnalysisRequest request) {
        Map<Integer, Integer> nodeIndex = new HashMap<>();
        int index = 0;
        for (AnalysisNode node : request.nodes()) {
            nodeIndex.put(node.id(), index++);
        }
        int dofCount = nodeIndex.size() * 6;

        Map<Integer, AnalysisMaterial> materialsById = new HashMap<>();
        for (AnalysisMaterial m : request.materials()) {
            materialsById.put(m.id(), m);
        }
        Map<Integer, AnalysisSection> sectionsById = new HashMap<>();
        for (AnalysisSection s : request.sections()) {
            sectionsById.put(s.id(), s);
        }
        Map<Integer, AnalysisNode> nodesById = new HashMap<>();
        for (AnalysisNode n : request.nodes()) {
            nodesById.put(n.id(), n);
        }

        double[][] globalK = new double[dofCount][dofCount];
        double[] globalF = new double[dofCount];

        for (AnalysisElement element : request.elements()) {
            AnalysisNode ni = requireNode(nodesById, element.nodeI());
            AnalysisNode nj = requireNode(nodesById, element.nodeJ());
            AnalysisMaterial material = requireMaterial(materialsById, element.materialId());
            AnalysisSection section = requireSection(sectionsById, element.sectionId());

            double length = Vector3.between(ni.xM(), ni.yM(), ni.zM(), nj.xM(), nj.yM(), nj.zM()).length();
            if (length < 1e-9) {
                throw new IllegalStateException("Element " + element.id() + " has zero length");
            }

            var props = RectangularSectionProperties.of(section);
            double g = material.elasticModulus() / (2 * (1 + material.poissonRatio()));

            double[][] localK = FrameElementStiffness.local(
                    material.elasticModulus(), g, props.areaM2(), props.iyM4(), props.izM4(), props.jM4(), length);
            double[][] rotation = FrameTransformation.rotationMatrix(ni.xM(), ni.yM(), ni.zM(), nj.xM(), nj.yM(), nj.zM());
            double[][] t12 = FrameTransformation.transformationMatrix12(rotation);
            double[][] globalElementK = MatrixUtils.toGlobal(localK, t12);

            assemble(globalK, globalElementK, nodeIndex.get(ni.id()), nodeIndex.get(nj.id()));

            for (SelfWeight selfWeight : request.selfWeights()) {
                double magnitude = props.areaM2() * material.weightDensity();
                double[] globalUdl = {
                        magnitude * selfWeight.factorX(),
                        magnitude * selfWeight.factorY(),
                        magnitude * selfWeight.factorZ(),
                };
                double[] nodalLoads = UniformLoadDistribution.equivalentNodalLoadsGlobal(globalUdl, rotation, length);
                addLoads(globalF, nodalLoads, nodeIndex.get(ni.id()), nodeIndex.get(nj.id()));
            }

            for (UniformElementLoad load : request.uniformLoads()) {
                if (load.elementId() != element.id()) {
                    continue;
                }
                double[] globalUdl = {load.wxKnPerM(), load.wyKnPerM(), load.wzKnPerM()};
                double[] nodalLoads = UniformLoadDistribution.equivalentNodalLoadsGlobal(globalUdl, rotation, length);
                addLoads(globalF, nodalLoads, nodeIndex.get(ni.id()), nodeIndex.get(nj.id()));
            }
        }

        for (ElasticLinkElement link : request.elasticLinks()) {
            AnalysisNode ni = requireNode(nodesById, link.nodeI());
            AnalysisNode nj = requireNode(nodesById, link.nodeJ());
            double[][] globalLinkK = ElasticLinkStiffness.global(
                    link.kx(), link.ky(), link.kz(), link.krx(), link.kry(), link.krz());
            assemble(globalK, globalLinkK, nodeIndex.get(ni.id()), nodeIndex.get(nj.id()));
        }

        boolean[] fixed = new boolean[dofCount];
        for (BoundaryCondition bc : request.supports()) {
            Integer nodePos = nodeIndex.get(bc.nodeId());
            if (nodePos == null) {
                continue;
            }
            int base = nodePos * 6;
            if (bc.dx()) fixed[base] = true;
            if (bc.dy()) fixed[base + 1] = true;
            if (bc.dz()) fixed[base + 2] = true;
            if (bc.rx()) fixed[base + 3] = true;
            if (bc.ry()) fixed[base + 4] = true;
            if (bc.rz()) fixed[base + 5] = true;
        }

        int freeCount = 0;
        for (boolean isFixed : fixed) {
            if (!isFixed) freeCount++;
        }
        int[] freeDofs = new int[freeCount];
        int cursor = 0;
        for (int i = 0; i < dofCount; i++) {
            if (!fixed[i]) freeDofs[cursor++] = i;
        }

        double[][] kFree = new double[freeCount][freeCount];
        double[] fFree = new double[freeCount];
        for (int r = 0; r < freeCount; r++) {
            fFree[r] = globalF[freeDofs[r]];
            for (int c = 0; c < freeCount; c++) {
                kFree[r][c] = globalK[freeDofs[r]][freeDofs[c]];
            }
        }

        double[] uFree = freeCount == 0 ? new double[0] : DenseLinearSolver.solve(kFree, fFree);

        double[] uFull = new double[dofCount];
        for (int r = 0; r < freeCount; r++) {
            uFull[freeDofs[r]] = uFree[r];
        }

        double[] reactionFull = MatrixUtils.multiply(globalK, uFull);
        for (int i = 0; i < dofCount; i++) {
            reactionFull[i] -= globalF[i];
        }

        Map<Integer, double[]> displacements = new HashMap<>();
        for (Map.Entry<Integer, Integer> entry : nodeIndex.entrySet()) {
            int base = entry.getValue() * 6;
            displacements.put(entry.getKey(), new double[] {
                    uFull[base], uFull[base + 1], uFull[base + 2], uFull[base + 3], uFull[base + 4], uFull[base + 5],
            });
        }

        Map<Integer, double[]> reactions = new HashMap<>();
        for (BoundaryCondition bc : request.supports()) {
            Integer nodePos = nodeIndex.get(bc.nodeId());
            if (nodePos == null) {
                continue;
            }
            int base = nodePos * 6;
            reactions.put(bc.nodeId(), new double[] {
                    reactionFull[base], reactionFull[base + 1], reactionFull[base + 2],
                    reactionFull[base + 3], reactionFull[base + 4], reactionFull[base + 5],
            });
        }

        return new SolveResult(displacements, reactions);
    }

    private static void assemble(double[][] globalK, double[][] elementK, int nodeIPos, int nodeJPos) {
        int[] dofMap = dofIndices(nodeIPos, nodeJPos);
        for (int r = 0; r < 12; r++) {
            for (int c = 0; c < 12; c++) {
                globalK[dofMap[r]][dofMap[c]] += elementK[r][c];
            }
        }
    }

    private static void addLoads(double[] globalF, double[] elementLoads, int nodeIPos, int nodeJPos) {
        int[] dofMap = dofIndices(nodeIPos, nodeJPos);
        for (int r = 0; r < 12; r++) {
            globalF[dofMap[r]] += elementLoads[r];
        }
    }

    private static int[] dofIndices(int nodeIPos, int nodeJPos) {
        int[] dofMap = new int[12];
        int baseI = nodeIPos * 6;
        int baseJ = nodeJPos * 6;
        for (int d = 0; d < 6; d++) {
            dofMap[d] = baseI + d;
            dofMap[6 + d] = baseJ + d;
        }
        return dofMap;
    }

    private static AnalysisNode requireNode(Map<Integer, AnalysisNode> nodesById, int id) {
        AnalysisNode node = nodesById.get(id);
        if (node == null) {
            throw new IllegalArgumentException("Unknown node id: " + id);
        }
        return node;
    }

    private static AnalysisMaterial requireMaterial(Map<Integer, AnalysisMaterial> materialsById, int id) {
        AnalysisMaterial material = materialsById.get(id);
        if (material == null) {
            throw new IllegalArgumentException("Unknown material id: " + id);
        }
        return material;
    }

    private static AnalysisSection requireSection(Map<Integer, AnalysisSection> sectionsById, int id) {
        AnalysisSection section = sectionsById.get(id);
        if (section == null) {
            throw new IllegalArgumentException("Unknown section id: " + id);
        }
        return section;
    }

    record SolveResult(Map<Integer, double[]> displacements, Map<Integer, double[]> reactions) {
    }
}
