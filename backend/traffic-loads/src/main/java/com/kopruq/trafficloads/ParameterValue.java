package com.kopruq.trafficloads;

/**
 * An engineering parameter with traceable provenance (TRAFFIC-P01,
 * docs/roadmap.md) - {@code value} is {@code null} when the parameter
 * is a genuinely unconfirmed EN 1991-2 numeric value (spec section 22 -
 * never invented from memory), not when it's simply zero.
 * {@code codeDefaultValue} is what "Restore Code Value" resets to.
 */
public record ParameterValue<T>(T value, ParameterProvenance provenance, T codeDefaultValue) {
}
