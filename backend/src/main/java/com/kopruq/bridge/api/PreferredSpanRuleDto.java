package com.kopruq.bridge.api;

/** JSON shape of one preferred span rule; every field is required. Spans are metres. */
public record PreferredSpanRuleDto(String id, String superstructureType, String girderVariantId, Double minSpan,
        Double maxSpan, Double spanDelta, Double primarySpan, Boolean enabled, String source) {
}
