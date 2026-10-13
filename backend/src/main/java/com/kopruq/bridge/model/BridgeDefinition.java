package com.kopruq.bridge.model;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The stored definition of one bridge: spans, axes, superstructure, per-axis family assignments and constraints.
 * {@code definitionKey} is the key of the frontend's normalized store (it equals the bridge id there, but that is
 * not enforced here). Span lengths and deck width in metres.
 */
public record BridgeDefinition(String definitionKey, String bridgeId, List<Double> spanLengthsM, List<BridgeAxis> axes,
        String superstructureType, String girderFamilyId, String girderVariantId, Double girderCount,
        Double deckWidthOverrideM, List<AxisFamilyAssignment> axisAssignments, String abutmentA1FamilyId,
        String abutmentA2FamilyId, String constructionMethod, String constructionStagesNote,
        List<BridgeConstraint> constraints) {

    public BridgeDefinition {
        SectionInvariants.notBlank("definitionKey", definitionKey);
        SectionInvariants.required("bridgeId", bridgeId);
        spanLengthsM = SectionInvariants.copyNonNull("spanLengthsM", spanLengthsM);
        for (Double span : spanLengthsM) {
            SectionInvariants.finite("spanLengthsM element", span);
        }
        axes = SectionInvariants.copyNonNull("axes", axes);
        SectionInvariants.required("superstructureType", superstructureType);
        SectionInvariants.finiteOrNull("girderCount", girderCount);
        SectionInvariants.finiteOrNull("deckWidthOverrideM", deckWidthOverrideM);
        axisAssignments = SectionInvariants.copyNonNull("axisAssignments", axisAssignments);
        Set<String> axisIds = new HashSet<>();
        for (AxisFamilyAssignment a : axisAssignments) {
            if (!axisIds.add(a.axisId())) {
                throw new IllegalArgumentException("axisAssignments axisId is duplicated: " + a.axisId());
            }
        }
        SectionInvariants.required("constructionMethod", constructionMethod);
        SectionInvariants.required("constructionStagesNote", constructionStagesNote);
        constraints = SectionInvariants.copyNonNull("constraints", constraints);
    }
}
