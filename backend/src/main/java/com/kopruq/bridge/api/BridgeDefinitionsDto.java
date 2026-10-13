package com.kopruq.bridge.api;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * JSON shape of the bridge definitions section: one entry per stored definition (the frontend's map, in key order).
 * Numbers are boxed so a missing one is reported, not silently zero; enums travel as constant names. UI-only state
 * ({@code selectedAxisId}, {@code viewMode}, ...) is not part of the shape and is rejected as an unknown field.
 * Lengths and chainages are metres, skew is degrees.
 */
public record BridgeDefinitionsDto(List<DefinitionDto> definitions) {

    public record DefinitionDto(String definitionKey, String bridgeId, List<Double> spanLengthsM,
            List<AxisDto> axes, String superstructureType, String girderFamilyId, String girderVariantId,
            Double girderCount, Double deckWidthOverrideM, List<AssignmentDto> axisAssignments,
            AbutmentFamilyIdsDto abutmentFamilyIds, String constructionMethod, String constructionStagesNote,
            List<ConstraintDto> constraints) {
    }

    public record AxisDto(String id, String name, String type, Double chainageM, Double elevationM,
            Double skewDegrees) {
    }

    public record AssignmentDto(String axisId, String pierFamilyId, Double pierHeightM, String pierCapFamilyId,
            String foundationFamilyId, Double foundationElevationM, String soilReference, String bearingFamilyId,
            Double bearingQuantity, String bearingOrientation, String longitudinalBehavior,
            String transverseBehavior) {
    }

    public record ConstraintDto(String id, String kind, String name, Double startChainageM, Double endChainageM,
            String note) {
    }

    public record AbutmentFamilyIdsDto(@JsonProperty("A1") String a1, @JsonProperty("A2") String a2) {
    }
}
