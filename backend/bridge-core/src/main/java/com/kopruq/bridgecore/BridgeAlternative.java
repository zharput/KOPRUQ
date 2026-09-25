package com.kopruq.bridgecore;

import java.util.Objects;
import java.util.UUID;

/**
 * One concrete bridge configuration: a single point in the design space
 * (Computational Mode, spec section 6.A), or one output of Generative
 * Mode (spec section 6.B). This is the type that satisfies P01's
 * success criterion: "a bridge can be represented independently of
 * MIDAS" (spec section 20, adapted from the original "independently of
 * ALLPLAN" per architecture amendment v2).
 *
 * <p>{@code deck}, {@code pier} and {@code foundation} are nullable, not
 * required: P03's own generation scope will be "span-layout and girder
 * alternatives" only (spec section 20's P03 example varies only Span
 * and Girder ranges - confirmed by the archived C#/Avalonia build,
 * which had to relax these from required to nullable mid-P03 for
 * exactly this reason). Modelling them nullable from P01 avoids
 * repeating that revision. Null means "not sized by this generation
 * step yet", never an invented default.
 */
public record BridgeAlternative(
        UUID id,
        SpanLayout spanLayout,
        Girder girder,
        Deck deck,
        Pier pier,
        Foundation foundation) {

    public BridgeAlternative {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(spanLayout, "spanLayout");
        Objects.requireNonNull(girder, "girder");
    }

    /** Convenience factory for the P03 scope: span-layout + girder only. */
    public static BridgeAlternative of(SpanLayout spanLayout, Girder girder) {
        return new BridgeAlternative(UUID.randomUUID(), spanLayout, girder, null, null, null);
    }
}
