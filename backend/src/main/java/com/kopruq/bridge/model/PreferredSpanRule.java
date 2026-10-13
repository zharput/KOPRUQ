package com.kopruq.bridge.model;

/**
 * One preferred span rule; every field is required. Spans in metres. The id is not guaranteed unique by the
 * frontend, so it is not checked here.
 */
public record PreferredSpanRule(String id, String superstructureType, String girderVariantId, double minSpan,
        double maxSpan, double spanDelta, double primarySpan, boolean enabled, String source) {

    public PreferredSpanRule {
        SectionInvariants.required("id", id);
        SectionInvariants.required("superstructureType", superstructureType);
        SectionInvariants.required("girderVariantId", girderVariantId);
        SectionInvariants.finite("minSpan", minSpan);
        SectionInvariants.finite("maxSpan", maxSpan);
        SectionInvariants.finite("spanDelta", spanDelta);
        SectionInvariants.finite("primarySpan", primarySpan);
        SectionInvariants.required("source", source);
    }
}
